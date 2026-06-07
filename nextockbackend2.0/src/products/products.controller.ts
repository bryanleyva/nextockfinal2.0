import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ProductsService } from './products.service';

@Controller('productos')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // Lista de productos de la bodega (con filtro por categoria opcional - HU-22)
  @Get()
  listar(@GetUser() user: User, @Query('categoria') categoria?: string) {
    return this.products.findAll(user.id, categoria);
  }

  // HU-21: buscador dentro del inventario
  @Get('buscar')
  async buscar(@GetUser() user: User, @Query('q') q: string) {
    if (!q || !q.trim()) {
      // HU-21 Escenario 3: busqueda vacia
      throw new BadRequestException('Ingrese un termino de busqueda');
    }
    const resultado = await this.products.buscar(user.id, q);
    if (resultado.length === 0) {
      return { mensaje: 'Producto no encontrado', productos: [] };
    }
    return { productos: resultado };
  }

  // HU-22: categorias para el filtro
  @Get('categorias')
  categorias(@GetUser() user: User) {
    return this.products.categorias(user.id);
  }
}
