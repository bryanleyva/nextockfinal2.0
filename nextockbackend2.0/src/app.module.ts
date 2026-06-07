import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { MlModule } from './ml/ml.module';
import { AnalysisModule } from './analysis/analysis.module';
import { DatasetModule } from './dataset/dataset.module';
import { SupportModule } from './support/support.module';
import { HistorialModule } from './historial/historial.module';

@Module({
  imports: [
    // Variables de entorno (.env) disponibles en toda la app
    ConfigModule.forRoot({ isGlobal: true }),

    // Imágenes subidas por los usuarios (avatares) -> /uploads/...
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Sirve el frontend Angular ya compilado (despliegue en un solo puerto).
    // Las rutas /api/* quedan excluidas para que las maneje el backend.
    ServeStaticModule.forRoot({
      rootPath:
        process.env.FRONTEND_DIST ||
        join(process.cwd(), '..', 'nextockfrontend-angular', 'dist', 'nextockfrontend-angular', 'browser'),
      exclude: ['/api*'],
    }),

    // Conexion a PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Soporta tanto variables sueltas (DB_HOST, ...) como una URL completa
        // (DATABASE_URL), que es como entregan la conexion Neon / Supabase / Render.
        const url = config.get<string>('DATABASE_URL');
        // Las bases gestionadas (Neon/Supabase) exigen SSL. Se activa con DB_SSL=true
        // o automaticamente si la conexion es por URL.
        const sslOn = config.get<string>('DB_SSL', 'false') === 'true' || !!url;
        const ssl = sslOn ? { rejectUnauthorized: false } : false;
        return {
          type: 'postgres' as const,
          ...(url
            ? { url }
            : {
                host: config.get<string>('DB_HOST', 'localhost'),
                port: config.get<number>('DB_PORT', 5432),
                username: config.get<string>('DB_USERNAME', 'postgres'),
                password: config.get<string>('DB_PASSWORD', 'postgres'),
                database: config.get<string>('DB_NAME', 'nextock'),
              }),
          ssl,
          autoLoadEntities: true,
          // synchronize crea/actualiza las tablas automaticamente (solo desarrollo)
          synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        };
      },
    }),

    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    MlModule,
    AnalysisModule,
    DatasetModule,
    SupportModule,
    HistorialModule,
  ],
})
export class AppModule {}
