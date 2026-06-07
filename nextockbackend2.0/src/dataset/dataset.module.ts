import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { FactSalesInventory } from '../inventory/entities/fact-sales-inventory.entity';
import { MlModule } from '../ml/ml.module';
import { DatasetService } from './dataset.service';
import { DatasetController } from './dataset.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, FactSalesInventory]), MlModule],
  providers: [DatasetService],
  controllers: [DatasetController],
})
export class DatasetModule {}
