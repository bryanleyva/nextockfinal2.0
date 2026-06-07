import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { InventoryService } from './inventory.service';

@Controller('inventario')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  // HU-05: panel de control con metricas clave
  @Get('metricas')
  metricas(@GetUser() user: User) {
    return this.inventory.metricas(user.id);
  }

  // HU-06 / HU-08: ventas diarias con filtro por rango de fechas
  @Get('ventas')
  ventas(@GetUser() user: User, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.inventory.ventasDiarias(user.id, desde, hasta);
  }
}
