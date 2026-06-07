import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Catalogo de productos (tabla PRODUCT del modelo de datos).
 * Usado por el buscador (HU-21) y el filtro por categoria (HU-22).
 */
@Entity({ name: 'product' })
export class Product {
  // Llave primaria compuesta: una bodega (store_id) puede tener su propio product_id.
  @PrimaryColumn({ name: 'store_id' })
  storeId: number;

  @PrimaryColumn({ name: 'product_id' })
  productId: number;

  @Column({ name: 'source_product_id' })
  sourceProductId: string; // SKU / codigo

  @Column({ name: 'product_name' })
  productName: string;

  @Column()
  category: string;

  @Column({ name: 'unit_measure', nullable: true })
  unitMeasure: string;

  @Column({ name: 'sale_price', type: 'numeric', precision: 12, scale: 2 })
  salePrice: number;

  @Column({ name: 'purchase_price', type: 'numeric', precision: 12, scale: 2 })
  purchasePrice: number;

  @Column({ name: 'lead_time_days', default: 0 })
  leadTimeDays: number;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date | null;
}
