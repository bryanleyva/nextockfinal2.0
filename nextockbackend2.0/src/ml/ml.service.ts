import { HttpService } from '@nestjs/axios';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

/**
 * Cliente del microservicio de Machine Learning (Python / FastAPI).
 * Centraliza todas las llamadas HTTP al ML para que el resto del backend
 * no dependa de los detalles del servicio.
 */
@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
  }

  /** Agrega ?store=<id> a la ruta para aislar los datos de la bodega. */
  private q(ruta: string, store: number): string {
    const sep = ruta.includes('?') ? '&' : '?';
    return `${ruta}${sep}store=${store}`;
  }

  private async get<T>(ruta: string): Promise<T> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<T>(`${this.baseUrl}${ruta}`),
      );
      return data;
    } catch (e) {
      const err = e as AxiosError;
      const detalle = (err.response?.data as any)?.detail;
      if (err.response?.status === 404) {
        throw new NotFoundException(detalle ?? 'Recurso no encontrado');
      }
      if (err.response?.status === 409) {
        // La bodega aun no tiene datos cargados
        throw new ConflictException(detalle ?? 'No hay datos cargados para esta bodega.');
      }
      this.logger.error(`Error llamando al ML (${ruta}): ${err.message}`);
      throw new InternalServerErrorException(
        'No se pudo conectar con el servicio de Machine Learning. Verifica que este corriendo (ML_SERVICE_URL).',
      );
    }
  }

  // HU-01: pronostico + diagnostico de un producto por SKU
  prediccion(store: number, sku: string) {
    return this.get(this.q(`/ml/predecir/${encodeURIComponent(sku)}`, store));
  }

  // Series (historico + pronostico) para graficos interactivos
  series(store: number, sku: string) {
    return this.get(this.q(`/ml/series/${encodeURIComponent(sku)}`, store));
  }

  // HU-09 / HU-11: reporte de prediccion de inventario (todos los productos)
  reporteInventario(store: number) {
    return this.get(this.q('/ml/reporte', store));
  }

  // HU-10: analisis financiero de todas las ventas
  finanzas(store: number) {
    return this.get(this.q('/ml/finanzas', store));
  }

  // HU-18: ranking de productos mas vendidos (n grande para cubrir toda la bodega)
  ranking(store: number, n = 50) {
    return this.get(`${this.q('/ml/ranking', store)}&n=${n}`);
  }

  // HU-03 / HU-17: reentrenar el modelo (tras actualizar datos)
  entrenar(store: number) {
    return this.get(this.q('/ml/entrenar', store));
  }
}
