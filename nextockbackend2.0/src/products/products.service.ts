import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
  ) {}

  /** Lista de productos de la bodega, opcionalmente filtrada por categoria (HU-22). */
  findAll(storeId: number, categoria?: string): Promise<Product[]> {
    const where: any = { storeId };
    if (categoria && categoria !== 'Todas') where.category = categoria;
    return this.repo.find({ where, order: { productId: 'ASC' } });
  }

  /** HU-21: buscador por SKU o nombre (solo dentro de la bodega). */
  async buscar(storeId: number, termino: string): Promise<Product[]> {
    const t = (termino ?? '').trim();
    if (!t) return []; // HU-21 Escenario 3: busqueda vacia (el controlador avisa)
    return this.repo.find({
      where: [
        { storeId, sourceProductId: ILike(`%${t}%`) },
        { storeId, productName: ILike(`%${t}%`) },
      ],
      order: { productId: 'ASC' },
    });
  }

  /** HU-22: categorias disponibles para el filtro (de la bodega). */
  async categorias(storeId: number): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.store_id = :storeId', { storeId })
      .orderBy('category', 'ASC')
      .getRawMany();
    return rows.map((r) => r.category);
  }

  findBySku(storeId: number, sku: string): Promise<Product | null> {
    return this.repo.findOne({ where: { storeId, sourceProductId: sku } });
  }
}
