import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { MailService } from './mail.service';

class ContactoDto {
  @IsString() nombre: string;
  @IsEmail({}, { message: 'Ingrese un correo valido' }) email: string;
  @IsString() mensaje: string;
}

class CompartirDto {
  @IsEmail({}, { message: 'Por favor, ingrese un correo valido' }) destinatario: string;
  @IsOptional() @IsString() asunto?: string;
  @IsOptional() @IsString() reporte?: string;
}

@Controller('soporte')
export class SupportController {
  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // HU-19: informacion de los encargados de la pagina
  @Get('encargados')
  encargados() {
    return {
      empresa: 'GRUPO DONNA S.A.C.',
      equipo: [
        { nombre: 'Alfredo Gabriel Pacheco Valle', rol: 'Jefe de Proyecto' },
        { nombre: 'Bryan Esteban Leyva Gutierrez', rol: 'Scrum Master' },
      ],
      contacto: this.mail.from,
    };
  }

  // HU-07: contacto con soporte
  @Post('contacto')
  async contacto(@Body() dto: ContactoDto) {
    const r = await this.mail.enviar({
      to: this.mail.from,
      subject: `Soporte NEXTOCK — ${dto.nombre}`,
      text: `De: ${dto.nombre} <${dto.email}>\n\n${dto.mensaje}`,
    });
    return { mensaje: 'Su mensaje fue enviado', ...r };
  }

  // HU-20: compartir reporte por el correo oficial de la aplicacion
  @Post('compartir')
  @UseGuards(JwtAuthGuard)
  async compartir(@GetUser() user: User, @Body() dto: CompartirDto) {
    // Adjuntar el reporte de inventario de la bodega si existe
    const dir = this.config.get<string>('ML_DATA_DIR', '../MLNEXTOCK/data');
    const base = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
    const csv = path.resolve(base, '..', 'outputs', 'reportes', 'stores', String(user.id), 'reporte_prediccion_inventario.csv');
    const attachments = fs.existsSync(csv)
      ? [{ filename: 'reporte_inventario.csv', path: csv }]
      : [];

    const r = await this.mail.enviar({
      to: dto.destinatario,
      subject: dto.asunto || 'Reporte de inventario — NEXTOCK',
      text: `Hola,\n\n${user.fullName} (${user.bodega || 'bodega'}) compartió contigo el reporte de inventario de NEXTOCK.\n\nSaludos.`,
      attachments,
    });
    const nota = r.simulado ? ' (modo simulado: configura MAIL_USER/MAIL_PASS para envío real)' : '';
    return { mensaje: `Reporte compartido a ${dto.destinatario} desde ${this.mail.from}${nota}`, ...r };
  }
}
