import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FactSalesInventory } from './entities/fact-sales-inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(FactSalesInventory)
    private readonly repo: Repository<FactSalesInventory>,
  ) {}

  /**
   * HU-05: panel de control con metricas clave del inventario.
   * Se calcula sobre el ultimo registro disponible de cada producto.
   */
  async metricas(storeId: number) {
    const ultimos = await this.repo.query(
      `
      SELECT DISTINCT ON (f.product_id)
             f.product_id, f.stock_final, f.sale_price, f.stockout_flag
      FROM fact_sales_inventory f
      WHERE f.store_id = $1
      ORDER BY f.product_id, f.record_date DESC
    `,
      [storeId],
    );

    if (!ultimos.length) {
      return { mensaje: 'No se pueden mostrar metricas', sin_datos: true };
    }

    let unidades = 0;
    let valor = 0;
    let bajoStock = 0;
    let agotados = 0;
    const UMBRAL_BAJO = 10; // unidades; bodega pequena

    for (const r of ultimos) {
      const stock = Number(r.stock_final);
      unidades += stock;
      valor += stock * Number(r.sale_price);
      if (stock <= 0) agotados += 1;
      else if (stock <= UMBRAL_BAJO) bajoStock += 1;
    }

    return {
      productos_total: ultimos.length,
      unidades_en_stock: Math.round(unidades),
      valor_inventario: Math.round(valor * 100) / 100,
      productos_bajo_stock: bajoStock,
      productos_agotados: agotados,
      tasa_quiebre_pct:
        Math.round((agotados / ultimos.length) * 1000) / 10,
    };
  }

  /**
   * HU-06 / HU-08: serie de ventas diarias, con filtro opcional por rango de fechas.
   */
  async ventasDiarias(storeId: number, desde?: string, hasta?: string) {
    const qb = this.repo
      .createQueryBuilder('f')
      .select('f.record_date', 'fecha')
      .addSelect('SUM(f.units_sold)', 'unidades')
      .addSelect('SUM(f.units_sold * f.sale_price)', 'ingreso')
      .where('f.store_id = :storeId', { storeId })
      .groupBy('f.record_date')
      .orderBy('f.record_date', 'ASC');

    if (desde) qb.andWhere('f.record_date >= :desde', { desde });
    if (hasta) qb.andWhere('f.record_date <= :hasta', { hasta });

    const rows = await qb.getRawMany();
    if (!rows.length) {
      // HU-08 Escenario 2: sin datos en el rango
      return { mensaje: 'No hay datos en este rango', datos: [] };
    }
    return {
      datos: rows.map((r) => ({
        fecha: r.fecha,
        unidades: Math.round(Number(r.unidades)),
        ingreso: Math.round(Number(r.ingreso) * 100) / 100,
      })),
    };
  }
}
