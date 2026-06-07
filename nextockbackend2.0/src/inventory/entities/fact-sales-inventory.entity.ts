import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Hechos de ventas e inventario (tabla FACT_SALES_INVENTORY).
 * Es la base que alimenta al modelo de Machine Learning y a los
 * reportes / dashboard (HU-05, HU-06, HU-08).
 */
@Entity({ name: 'fact_sales_inventory' })
export class FactSalesInventory {
  // Llave primaria compuesta (store_id, fact_id): aísla los datos por bodega.
  @PrimaryColumn({ name: 'store_id' })
  storeId: number;

  @PrimaryColumn({ name: 'fact_id' })
  factId: number;

  @Index()
  @Column({ name: 'product_id' })
  productId: number;

  @Column()
  category: number;

  @Index()
  @Column({ name: 'record_date', type: 'date' })
  recordDate: string;

  @Column({ name: 'stock_initial', type: 'numeric', precision: 12, scale: 2, default: 0 })
  stockInitial: number;

  @Column({ name: 'units_received', type: 'numeric', precision: 12, scale: 2, default: 0 })
  unitsReceived: number;

  @Column({ name: 'units_sold', type: 'numeric', precision: 12, scale: 2, default: 0 })
  unitsSold: number;

  @Column({ name: 'stock_final', type: 'numeric', precision: 12, scale: 2, default: 0 })
  stockFinal: number;

  @Column({ name: 'days_since_last_order', default: 0 })
  daysSinceLastOrder: number;

  @Column({ name: 'last_order_qty', type: 'numeric', precision: 12, scale: 2, default: 0 })
  lastOrderQty: number;

  @Column({ name: 'sales_avg_7_days', type: 'numeric', precision: 12, scale: 2, default: 0 })
  salesAvg7Days: number;

  @Column({ name: 'sale_price', type: 'numeric', precision: 12, scale: 2, default: 0 })
  salePrice: number;

  @Column({ name: 'lead_time_days', default: 0 })
  leadTimeDays: number;

  @Column({ name: 'day_of_week', default: 0 })
  dayOfWeek: number;

  @Column({ default: 0 })
  month: number;

  @Column({ name: 'stockout_flag', default: false })
  stockoutFlag: boolean;

  @Column({ name: 'target_units_sold', type: 'numeric', precision: 12, scale: 2, nullable: true })
  targetUnitsSold: number | null;
}
