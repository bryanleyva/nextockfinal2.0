import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

import { Product } from '../products/entities/product.entity';
import { FactSalesInventory } from '../inventory/entities/fact-sales-inventory.entity';
import { MlService } from '../ml/ml.service';

type Fila = Record<string, any>;

/** Tipo de movimiento manual de inventario. */
export type TipoMovimiento = 'venta' | 'ingreso' | 'ajuste';
export interface MovimientoDto {
  productId: number;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha?: string; // YYYY-MM-DD; por defecto hoy
}

@Injectable()
export class DatasetService implements OnModuleInit {
  private readonly logger = new Logger(DatasetService.name);
  private readonly mlDataDir: string;

  // Reentrenamiento en segundo plano: debounce por bodega + sin solapamiento.
  private readonly RETRAIN_DEBOUNCE_MS = 8000;
  private readonly retrainTimers = new Map<number, NodeJS.Timeout>();
  private readonly retrainEnCurso = new Set<number>();
  private readonly retrainPendiente = new Set<number>();

  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(FactSalesInventory) private readonly facts: Repository<FactSalesInventory>,
    private readonly ml: MlService,
    config: ConfigService,
  ) {
    const dir = config.get<string>('ML_DATA_DIR', '../MLNEXTOCK/data');
    this.mlDataDir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  }

  /**
   * Al arrancar, regenera los CSV que consume el ML a partir de la base de datos.
   * Asi, en hosting con disco efimero (los CSV se pierden al reiniciar) la app se
   * recupera sola: la verdad vive en Postgres y desde ahi se reconstruyen los CSV.
   */
  async onModuleInit() {
    try {
      const stores = await this.facts
        .createQueryBuilder('f')
        .select('DISTINCT f.store_id', 'storeId')
        .getRawMany<{ storeId: number }>();
      const ids = new Set<number>(stores.map((s) => Number(s.storeId)));
      const prodStores = await this.products
        .createQueryBuilder('p')
        .select('DISTINCT p.store_id', 'storeId')
        .getRawMany<{ storeId: number }>();
      prodStores.forEach((s) => ids.add(Number(s.storeId)));

      for (const storeId of ids) {
        await this.exportarFactCsv(storeId);
        await this.exportarProductoCsv(storeId);
      }
      if (ids.size) this.logger.log(`CSVs del ML regenerados desde la BD para ${ids.size} bodega(s).`);
    } catch (e) {
      this.logger.warn(`No se pudieron regenerar los CSV al arrancar: ${(e as Error).message}`);
    }
  }

  /**
   * Programa un reentrenamiento del modelo en segundo plano. Hace "debounce":
   * si llegan varios movimientos seguidos, reentrena UNA sola vez al terminar la
   * rafaga. Nunca corre dos reentrenamientos a la vez para la misma bodega.
   */
  private programarReentrenamiento(storeId: number) {
    const prev = this.retrainTimers.get(storeId);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      this.retrainTimers.delete(storeId);
      void this.ejecutarReentrenamiento(storeId);
    }, this.RETRAIN_DEBOUNCE_MS);
    if (typeof t.unref === 'function') t.unref(); // no impedir que el proceso termine
    this.retrainTimers.set(storeId, t);
  }

  private async ejecutarReentrenamiento(storeId: number) {
    if (this.retrainEnCurso.has(storeId)) {
      // Ya hay uno corriendo: marca que al terminar vuelva a reentrenar.
      this.retrainPendiente.add(storeId);
      return;
    }
    this.retrainEnCurso.add(storeId);
    try {
      const r: any = await this.ml.entrenar(storeId);
      const mae = r?.mae ?? r?.metricas?.mae;
      this.logger.log(`Reentrenamiento en segundo plano OK (bodega ${storeId}${mae !== undefined ? `, MAE ${mae}` : ''}).`);
    } catch (e) {
      this.logger.warn(`Reentrenamiento en segundo plano fallo (bodega ${storeId}): ${(e as Error).message}`);
    } finally {
      this.retrainEnCurso.delete(storeId);
      if (this.retrainPendiente.has(storeId)) {
        this.retrainPendiente.delete(storeId);
        void this.ejecutarReentrenamiento(storeId);
      }
    }
  }

  /** Lee CSV o Excel (.xlsx/.xls) y devuelve filas como objetos. */
  private leer(buffer: Buffer, filename: string): Fila[] {
    try {
      if (/\.xlsx?$/i.test(filename)) {
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const hoja = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json(hoja, { defval: '' });
      }
      return parse(buffer.toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      throw new BadRequestException('Formato no compatible'); // HU-17 Escenario 2
    }
  }

  /** Escribe un CSV para el ML (a partir de las filas, sea el origen CSV o Excel). */
  private guardarCsvParaML(storeId: number, nombre: string, filas: Fila[]) {
    try {
      const dir = path.join(this.mlDataDir, 'stores', String(storeId));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(filas));
      fs.writeFileSync(path.join(dir, nombre), csv, 'utf-8');
    } catch (e) {
      this.logger.warn(`No se pudo copiar ${nombre} al ML: ${(e as Error).message}`);
    }
  }

  /** HU-17: subir catalogo de productos (CSV o Excel) de la bodega. */
  async cargarProductos(storeId: number, buffer: Buffer, filename: string) {
    const filas = this.leer(buffer, filename);
    if (!filas.length) throw new BadRequestException('El archivo no contiene datos');

    const entidades = filas.map((r) =>
      this.products.create({
        storeId,
        productId: Number(r.product_id),
        sourceProductId: String(r.source_product_id),
        productName: String(r.product_name),
        category: String(r.category),
        unitMeasure: String(r.unit_measure ?? ''),
        salePrice: Number(r.sale_price),
        purchasePrice: Number(r.purchase_price),
        leadTimeDays: Number(r.lead_time_days ?? 0),
        active: String(r.active).toLowerCase() !== 'false',
        createdAt: r.created_at ? new Date(r.created_at) : null,
      }),
    );

    await this.products.delete({ storeId });
    await this.products.save(entidades, { chunk: 500 });
    this.guardarCsvParaML(storeId, 'product.csv', filas);
    return { tabla: 'product', filas: entidades.length };
  }

  /**
   * HU-17 / HU-03: subir hechos de ventas e inventario (CSV o Excel) de forma
   * INCREMENTAL: en vez de borrar todo, solo reemplaza las fechas que vienen en
   * el archivo (upsert por dia) y conserva el historico previo. Asi el inventario
   * se mantiene al dia con cada nueva carga, sin perder los datos anteriores.
   */
  async cargarHechos(storeId: number, buffer: Buffer, filename: string) {
    const filas = this.leer(buffer, filename);
    if (!filas.length) throw new BadRequestException('El archivo no contiene datos');

    // Fechas presentes en el archivo: solo esas se reemplazan (las demas se conservan).
    const fechas = [...new Set(filas.map((r) => String(r.record_date)))];
    await this.facts.delete({ storeId, recordDate: In(fechas) });

    // IDs nuevos a continuacion del maximo existente (fact_id es solo un surrogate).
    let nextId = (await this.maxFactId(storeId)) + 1;

    const entidades = filas.map((r) =>
      this.facts.create({
        storeId,
        factId: nextId++,
        productId: Number(r.product_id),
        category: Number(r.category),
        recordDate: String(r.record_date),
        stockInitial: Number(r.stock_initial),
        unitsReceived: Number(r.units_received),
        unitsSold: Number(r.units_sold),
        stockFinal: Number(r.stock_final),
        daysSinceLastOrder: Number(r.days_since_last_order ?? 0),
        lastOrderQty: Number(r.last_order_qty ?? 0),
        salesAvg7Days: Number(r.sales_avg_7_days ?? 0),
        salePrice: Number(r.sale_price),
        leadTimeDays: Number(r.lead_time_days ?? 0),
        dayOfWeek: Number(r.day_of_week ?? 0),
        month: Number(r.month ?? 0),
        stockoutFlag: String(r.stockout_flag).toLowerCase() === 'true',
        targetUnitsSold: r.target_units_sold !== '' && r.target_units_sold != null ? Number(r.target_units_sold) : null,
      }),
    );

    await this.facts.save(entidades, { chunk: 1000 });
    // El ML lee el CSV completo: exportamos TODO el historico acumulado de la bodega.
    await this.exportarFactCsv(storeId);
    const total = await this.facts.count({ where: { storeId } });
    return { tabla: 'fact_sales_inventory', filas: entidades.length, total_historico: total };
  }

  /** Mayor fact_id usado por la bodega (0 si no hay datos). */
  private async maxFactId(storeId: number): Promise<number> {
    const row = await this.facts
      .createQueryBuilder('f')
      .select('MAX(f.fact_id)', 'max')
      .where('f.store_id = :storeId', { storeId })
      .getRawOne<{ max: string | null }>();
    return row?.max ? Number(row.max) : 0;
  }

  /** Exporta TODO el historico de hechos de la bodega al CSV que consume el ML. */
  private async exportarFactCsv(storeId: number) {
    const rows = await this.facts.find({
      where: { storeId },
      order: { productId: 'ASC', recordDate: 'ASC' },
    });
    const filas: Fila[] = rows.map((f) => ({
      fact_id: f.factId,
      product_id: f.productId,
      category: f.category,
      record_date: f.recordDate,
      stock_initial: f.stockInitial,
      units_received: f.unitsReceived,
      units_sold: f.unitsSold,
      stock_final: f.stockFinal,
      days_since_last_order: f.daysSinceLastOrder,
      last_order_qty: f.lastOrderQty,
      sales_avg_7_days: f.salesAvg7Days,
      sale_price: f.salePrice,
      lead_time_days: f.leadTimeDays,
      day_of_week: f.dayOfWeek,
      month: f.month,
      stockout_flag: f.stockoutFlag,
      target_units_sold: f.targetUnitsSold ?? '',
    }));
    this.guardarCsvParaML(storeId, 'fact_sales_inventory.csv', filas);
  }

  /** Exporta el catalogo de productos de la bodega al CSV que consume el ML. */
  private async exportarProductoCsv(storeId: number) {
    const rows = await this.products.find({ where: { storeId }, order: { productId: 'ASC' } });
    if (!rows.length) return;
    const filas: Fila[] = rows.map((p) => ({
      store_id: p.storeId,
      product_id: p.productId,
      source_product_id: p.sourceProductId,
      product_name: p.productName,
      category: p.category,
      unit_measure: p.unitMeasure ?? '',
      sale_price: p.salePrice,
      purchase_price: p.purchasePrice,
      lead_time_days: p.leadTimeDays,
      active: p.active,
      created_at: p.createdAt ? p.createdAt.toISOString() : '',
    }));
    this.guardarCsvParaML(storeId, 'product.csv', filas);
  }

  /**
   * Registra un MOVIMIENTO manual de inventario (venta / ingreso / ajuste) sobre
   * un producto, sin necesidad de subir un CSV. Actualiza (o crea) la fila del dia
   * y refresca el CSV del ML para que el "stock actual" y "dias a quiebre" reflejen
   * el cambio al instante.
   */
  async registrarMovimiento(storeId: number, dto: MovimientoDto) {
    const cantidad = Number(dto.cantidad);
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      throw new BadRequestException('La cantidad debe ser un numero mayor o igual a 0');
    }
    if (!['venta', 'ingreso', 'ajuste'].includes(dto.tipo)) {
      throw new BadRequestException('Tipo de movimiento no valido');
    }

    const producto = await this.products.findOne({
      where: { storeId, productId: Number(dto.productId) },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado en tu bodega');

    // Ultimo registro del producto: de ahi sacamos stock previo y contexto.
    const ultima = await this.facts.findOne({
      where: { storeId, productId: producto.productId },
      order: { recordDate: 'DESC', factId: 'DESC' },
    });

    const hoy = new Date().toISOString().slice(0, 10);
    const fecha = (dto.fecha || hoy).slice(0, 10);
    const stockPrevio = ultima ? Number(ultima.stockFinal) : 0;

    // Fila del dia: si ya existe se actualiza; si no, se crea con id nuevo.
    let fila = await this.facts.findOne({
      where: { storeId, productId: producto.productId, recordDate: fecha },
    });
    const esNueva = !fila;
    if (!fila) {
      fila = this.facts.create({
        storeId,
        factId: (await this.maxFactId(storeId)) + 1,
        productId: producto.productId,
        category: ultima ? ultima.category : 0,
        recordDate: fecha,
        stockInitial: stockPrevio,
        unitsReceived: 0,
        unitsSold: 0,
        stockFinal: stockPrevio,
        daysSinceLastOrder: ultima ? Number(ultima.daysSinceLastOrder) + 1 : 0,
        lastOrderQty: ultima ? Number(ultima.lastOrderQty) : 0,
        salesAvg7Days: 0,
        salePrice: ultima ? Number(ultima.salePrice) : Number(producto.salePrice),
        leadTimeDays: Number(producto.leadTimeDays),
        dayOfWeek: (new Date(fecha + 'T00:00:00Z').getUTCDay() + 6) % 7, // lunes=0
        month: Number(fecha.slice(5, 7)),
        stockoutFlag: false,
        targetUnitsSold: 0,
      });
    }

    // Aplicar el movimiento sobre la fila del dia.
    const base = esNueva ? stockPrevio : Number(fila.stockInitial);
    if (dto.tipo === 'venta') {
      fila.unitsSold = Number(fila.unitsSold) + cantidad;
    } else if (dto.tipo === 'ingreso') {
      fila.unitsReceived = Number(fila.unitsReceived) + cantidad;
      fila.daysSinceLastOrder = 0;
      fila.lastOrderQty = cantidad;
    }
    if (dto.tipo === 'ajuste') {
      // Conteo real: el stock final pasa a ser exactamente la cantidad indicada.
      fila.stockFinal = cantidad;
    } else {
      fila.stockFinal = Math.max(base + Number(fila.unitsReceived) - Number(fila.unitsSold), 0);
    }
    fila.salesAvg7Days = await this.promedioVentas7d(storeId, producto.productId, fecha);
    fila.stockoutFlag = Number(fila.stockFinal) <= 0;
    fila.targetUnitsSold = Number(fila.unitsSold);

    await this.facts.save(fila);
    await this.exportarFactCsv(storeId);
    // El stock ya quedo actualizado al instante (el ML relee el CSV en cada llamada).
    // Ademas, reentrenamos el modelo en segundo plano para que aprenda de los datos nuevos.
    this.programarReentrenamiento(storeId);

    return {
      ok: true,
      producto: { id: producto.productId, sku: producto.sourceProductId, nombre: producto.productName },
      fecha,
      tipo: dto.tipo,
      cantidad,
      stock_anterior: Math.round(stockPrevio * 100) / 100,
      stock_actual: Math.round(Number(fila.stockFinal) * 100) / 100,
      reentrenando: true,
    };
  }

  /** Promedio de unidades vendidas del producto en los ultimos 7 dias (incluida la fecha dada). */
  private async promedioVentas7d(storeId: number, productId: number, fecha: string): Promise<number> {
    const rows = await this.facts.find({
      where: { storeId, productId },
      order: { recordDate: 'DESC' },
      take: 7,
    });
    if (!rows.length) return 0;
    const suma = rows.reduce((acc, r) => acc + Number(r.unitsSold), 0);
    return Math.round((suma / rows.length) * 100) / 100;
  }

  /**
   * Estado / frescura de los datos: hasta que fecha llega el historico y cuantos
   * dias han pasado, para avisar al usuario que actualice si estan viejos.
   */
  async estadoDatos(storeId: number) {
    const row = await this.facts
      .createQueryBuilder('f')
      .select('MAX(f.record_date)', 'ultima')
      .addSelect('MIN(f.record_date)', 'primera')
      .addSelect('COUNT(DISTINCT f.record_date)', 'dias')
      .addSelect('COUNT(DISTINCT f.product_id)', 'productos')
      .where('f.store_id = :storeId', { storeId })
      .getRawOne<{ ultima: string | null; primera: string | null; dias: string; productos: string }>();

    if (!row?.ultima) return { sin_datos: true };

    const ultima = this.fechaISO(row.ultima);
    const hoy = new Date();
    const msDia = 24 * 60 * 60 * 1000;
    const [y, m, d] = ultima.split('-').map(Number);
    const diasDesde = Math.max(
      0,
      Math.floor((Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()) - Date.UTC(y, m - 1, d)) / msDia),
    );
    return {
      sin_datos: false,
      ultima_fecha: ultima,
      primera_fecha: row.primera ? this.fechaISO(row.primera) : null,
      dias_desde_ultima: diasDesde,
      total_dias: Number(row.dias),
      productos: Number(row.productos),
      desactualizado: diasDesde > 7,
    };
  }

  /** Normaliza una fecha (Date o string del driver) a 'YYYY-MM-DD' sin desfase de zona horaria. */
  private fechaISO(v: any): string {
    if (v instanceof Date) {
      return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
    }
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
