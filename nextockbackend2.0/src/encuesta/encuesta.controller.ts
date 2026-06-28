import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { EncuestaService, EncuestaDto } from './encuesta.service';

/** Encuesta de Experiencia de Usuario (validación de la tesis). */
@Controller('encuesta')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EncuestaController {
  constructor(private readonly encuesta: EncuestaService) {}

  // ¿Toca mostrarle la encuesta a este usuario? (5° día desde el registro)
  @Get('pendiente')
  pendiente(@GetUser() user: User) {
    return this.encuesta.pendiente(user);
  }

  // Guardar las respuestas (cualquier usuario logueado, una sola vez)
  @Post()
  guardar(@GetUser() user: User, @Body() dto: EncuestaDto) {
    return this.encuesta.guardar(user, dto);
  }

  // ADMIN: ver todas las respuestas + promedios
  @Get('admin/respuestas')
  @Roles(UserRole.ADMIN)
  respuestas() {
    return this.encuesta.respuestas();
  }
}
