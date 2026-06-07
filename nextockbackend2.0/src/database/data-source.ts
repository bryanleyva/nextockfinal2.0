import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { FactSalesInventory } from '../inventory/entities/fact-sales-inventory.entity';

dotenv.config();

// Acepta una URL completa (Neon/Supabase/Render) o variables sueltas.
const url = process.env.DATABASE_URL;
const sslOn = process.env.DB_SSL === 'true' || !!url;

/** DataSource standalone, usado por los scripts (ej. seed). */
export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(url
    ? { url }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'nextock',
      }),
  ssl: sslOn ? { rejectUnauthorized: false } : false,
  entities: [User, Product, FactSalesInventory],
  synchronize: true,
});
