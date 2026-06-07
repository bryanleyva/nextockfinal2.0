import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsObject, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { AnalysisHistory } from './entities/analysis-history.entity';

class GuardarDto {
  @IsString() tipo: string;
  @IsString() titulo: string;
  @IsObject() resumen: any;
}

/**
 * HU-02: historial de análisis anteriores (por bodega).
 */
@Controller('historial')
@UseGuards(JwtAuthGuard)
export class HistorialController {
  constructor(
    @InjectRepository(AnalysisHistory) private readonly repo: Repository<AnalysisHistory>,
  ) {}

  // Guardar una foto del análisis actual
  @Post()
  async guardar(@GetUser() user: User, @Body() dto: GuardarDto) {
    const reg = this.repo.create({ storeId: user.id, ...dto });
    return this.repo.save(reg);
  }

  // Listar los análisis guardados de la bodega (más recientes primero)
  @Get()
  async listar(@GetUser() user: User) {
    const items = await this.repo.find({ where: { storeId: user.id }, order: { createdAt: 'DESC' } });
    if (!items.length) return { mensaje: 'No hay análisis registrados', items: [] }; // HU-02 Escenario 2
    return { items };
  }

  @Get(':id')
  detalle(@GetUser() user: User, @Param('id') id: string) {
    return this.repo.findOne({ where: { id: Number(id), storeId: user.id } });
  }
}
