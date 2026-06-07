import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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

  // HU-18: ranking de productos mas vendidos
  @Get('ranking')
  ranking(@GetUser() user: User) {
    return this.ml.ranking(user.id);
  }
}
