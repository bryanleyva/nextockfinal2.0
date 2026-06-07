import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactSalesInventory } from './entities/fact-sales-inventory.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FactSalesInventory])],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService, TypeOrmModule],
})
export class InventoryModule {}
