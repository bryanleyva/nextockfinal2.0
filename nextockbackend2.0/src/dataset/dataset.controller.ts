import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { DatasetService, MovimientoDto } from './dataset.service';
import { MlService } from '../ml/ml.service';

/**
 * HU-17: subir la base de datos en CSV para que la pagina la analice.
 * HU-03: actualizar la base de datos (al recargar hechos se reentrena el modelo).
 */
@Controller('datos')
@UseGuards(JwtAuthGuard)
export class DatasetController {
  constructor(
    private readonly dataset: DatasetService,
    private readonly ml: MlService,
  ) {}

  // Subir catalogo de productos (product.csv)
  @Post('productos')
  @UseInterceptors(FileInterceptor('file'))
  async subirProductos(@GetUser() user: User, @UploadedFile() file: Express.Multer.File) {
    this.validar(file);
    return this.dataset.cargarProductos(user.id, file.buffer, file.originalname);
  }

  // Subir hechos de ventas/inventario (fact_sales_inventory.csv) y reentrenar
  @Post('hechos')
  @UseInterceptors(FileInterceptor('file'))
  async subirHechos(@GetUser() user: User, @UploadedFile() file: Express.Multer.File) {
    this.validar(file);
    const res = await this.dataset.cargarHechos(user.id, file.buffer, file.originalname);
    // HU-03: tras actualizar los datos, reentrenar el modelo XGBoost de la bodega
    let entrenamiento: any = null;
    try {
      entrenamiento = await this.ml.entrenar(user.id);
    } catch (e) {
      entrenamiento = { aviso: 'Datos cargados, pero no se pudo reentrenar el ML ahora.' };
    }
    return { ...res, entrenamiento };
  }

  // Registrar un movimiento manual (venta / ingreso / ajuste) de un producto.
  // Mantiene el inventario al dia sin necesidad de re-subir un CSV.
  @Post('movimiento')
  async movimiento(@GetUser() user: User, @Body() dto: MovimientoDto) {
    if (dto?.productId == null || dto?.tipo == null || dto?.cantidad == null) {
      throw new BadRequestException('Faltan datos del movimiento (productId, tipo, cantidad)');
    }
    return this.dataset.registrarMovimiento(user.id, dto);
  }

  // Estado / frescura de los datos (hasta que fecha llega el historico).
  @Get('estado')
  estado(@GetUser() user: User) {
    return this.dataset.estadoDatos(user.id);
  }

  private validar(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibio ningun archivo');
    const okExt = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (!okExt) {
      // HU-17 Escenario 2: formato no valido
      throw new BadRequestException('Formato no compatible. Suba un archivo .csv o Excel (.xlsx)');
    }
    const LIMITE = 10 * 1024 * 1024; // 10 MB
    if (file.size > LIMITE) {
      // HU-17 Escenario 3: archivo demasiado grande
      throw new BadRequestException('El archivo excede el limite permitido');
    }
  }
}
