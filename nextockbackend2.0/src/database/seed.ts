/**
 * Carga inicial: lee los CSV del proyecto de ML (MLNEXTOCK/data) y los inserta
 * en PostgreSQL (tablas product y fact_sales_inventory). Tambien crea un usuario
 * de prueba para poder iniciar sesion.
 *
 * Uso:  npm run seed
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from './data-source';
import { User, UserRole } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { FactSalesInventory } from '../inventory/entities/fact-sales-inventory.entity';

function leer(dir: string, archivo: string): any[] {
  const ruta = path.join(dir, archivo);
  if (!fs.existsSync(ruta)) {
    throw new Error(`No se encontro ${ruta}. Genera el dataset en MLNEXTOCK primero.`);
  }
  return parse(fs.readFileSync(ruta, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

async function main() {
  const dataDir = process.env.ML_DATA_DIR
    ? path.resolve(process.cwd(), process.env.ML_DATA_DIR)
    : path.resolve(process.cwd(), '..', 'MLNEXTOCK', 'data');

  console.log(`Leyendo CSV desde: ${dataDir}`);
  await AppDataSource.initialize();

  const productRepo = AppDataSource.getRepository(Product);
  const factRepo = AppDataSource.getRepository(FactSalesInventory);
  const userRepo = AppDataSource.getRepository(User);

  // ---- Usuario de prueba (su id es el store_id de la bodega demo) ----
  const email = 'admin@nextock.com';
  let admin = await userRepo.findOne({ where: { email } });
  if (!admin) {
    admin = await userRepo.save(
      userRepo.create({
        email,
        password: await bcrypt.hash('admin123', 10),
        fullName: 'Administrador',
        bodega: 'Bodega Central',
        role: UserRole.ADMIN,
      }),
    );
  }
  const storeId = admin.id;
  console.log(`  bodega demo (store_id): ${storeId}  ->  ${email} / admin123`);

  // ---- Productos (asignados a la bodega demo) ----
  const productos = leer(dataDir, 'product.csv').map((r) =>
    productRepo.create({
      productId: Number(r.product_id),
      storeId,
      sourceProductId: r.source_product_id,
      productName: r.product_name,
      category: r.category,
      unitMeasure: r.unit_measure,
      salePrice: Number(r.sale_price),
      purchasePrice: Number(r.purchase_price),
      leadTimeDays: Number(r.lead_time_days ?? 0),
      active: String(r.active).toLowerCase() !== 'false',
      createdAt: r.created_at ? new Date(r.created_at) : null,
    }),
  );
  await factRepo.delete({ storeId });
  await productRepo.delete({ storeId });
  await productRepo.save(productos, { chunk: 500 });
  console.log(`  product: ${productos.length} filas`);

  // ---- Hechos (asignados a la bodega demo) ----
  const hechos = leer(dataDir, 'fact_sales_inventory.csv').map((r) =>
    factRepo.create({
      factId: Number(r.fact_id),
      storeId,
      productId: Number(r.product_id),
      category: Number(r.category),
      recordDate: r.record_date,
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
      targetUnitsSold: r.target_units_sold ? Number(r.target_units_sold) : null,
    }),
  );
  await factRepo.save(hechos, { chunk: 1000 });
  console.log(`  fact_sales_inventory: ${hechos.length} filas`);

  // ---- Copiar los CSV a la carpeta de la bodega demo en el ML (data/stores/<id>/) ----
  const destino = path.join(dataDir, 'stores', String(storeId));
  fs.mkdirSync(destino, { recursive: true });
  fs.copyFileSync(path.join(dataDir, 'product.csv'), path.join(destino, 'product.csv'));
  fs.copyFileSync(path.join(dataDir, 'fact_sales_inventory.csv'), path.join(destino, 'fact_sales_inventory.csv'));
  console.log(`  CSV copiados a: ${destino}`);

  await AppDataSource.destroy();
  console.log('Seed completado.');
}

main().catch((e) => {
  console.error('Error en seed:', e.message);
  process.exit(1);
});
