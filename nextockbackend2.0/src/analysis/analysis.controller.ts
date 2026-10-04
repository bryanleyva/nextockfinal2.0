import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { MlService } from '../ml/ml.service';

/**
 * Endpoints de analisis predictivo (consumen el microservicio de ML).
 * Cada llamada se aisla por bodega usando el id del usuario autenticado.
 *   HU-01: pronostico de demanda por producto
 *   HU-09 / HU-11: reporte de inventario con sugerencias y sobre stock / deficit
 *   HU-10: reporte financiero
 *   HU-18: ranking de productos mas vendidos
 */
@Controller('analisis')
@UseGuards(JwtAuthGuard)
export class AnalysisController {
  constructor(private readonly ml: MlService) {}

  // HU-01: pronostico + diagnostico de un producto (por SKU/codigo)
  @Get('prediccion/:sku')
  prediccion(@GetUser() user: User, @Param('sku') sku: string) {
    return this.ml.prediccion(user.id, sku);
  }

  // Series para graficos interactivos (Highcharts) de un producto
  @Get('series/:sku')
  series(@GetUser() user: User, @Param('sku') sku: string) {
    return this.ml.series(user.id, sku);
  }

  // HU-09 / HU-11: reporte de prediccion de inventario (todos los productos)
  @Get('reporte-inventario')
  reporteInventario(@GetUser() user: User) {
    return this.ml.reporteInventario(user.id);
  }

  // HU-10: reporte financiero de todas las ventas
  @Get('finanzas')
  finanzas(@GetUser() user: User) {
    return this.ml.finanzas(user.id);
  }

  // HU-18: ranking de productos mas vendidos. ?n= limita el top (1 a 100);
  // sin n devuelve todos los productos (lo usa el analisis financiero).
  @Get('ranking')
  ranking(@GetUser() user: User, @Query('n') n?: string) {
    if (n === undefined || n === '') return this.ml.ranking(user.id);
    const top = Number(n);
    if (!Number.isInteger(top) || top < 1 || top > 100) {
      throw new BadRequestException('El límite del top debe ser un número entero entre 1 y 100');
    }
    return this.ml.ranking(user.id, top);
  }
}
