import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurveyUx } from './encuesta.entity';
import { User, UserRole } from '../users/entities/user.entity';

export interface EncuestaDto {
  p1: number; p2: number; p3: number; p4: number; p5: number;
}

@Injectable()
export class EncuestaService {
  private readonly diasParaMostrar: number;

  constructor(
    @InjectRepository(SurveyUx) private readonly repo: Repository<SurveyUx>,
    config: ConfigService,
  ) {
    // Días tras el registro para mostrar la encuesta (configurable, por defecto 5).
    this.diasParaMostrar = Number(config.get<string>('ENCUESTA_DIAS', '5'));
  }

  /** ¿Debe mostrarse la encuesta a este usuario? (≥ N días desde el registro y sin responder). */
  async pendiente(user: User) {
    const ya = await this.repo.findOne({ where: { userId: user.id } });
    if (ya) return { mostrar: false, motivo: 'ya_respondida' };
    if (user.role === UserRole.ADMIN) return { mostrar: false, motivo: 'admin' };

    const transcurridos = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000);
    const diaActual = transcurridos + 1; // el día de registro cuenta como día 1
    return {
      mostrar: diaActual >= this.diasParaMostrar, // aparece EN el 5° día
      dia_actual: diaActual,
      dia_objetivo: this.diasParaMostrar,
    };
  }

  /** Guarda la respuesta (una sola vez por usuario). */
  async guardar(user: User, dto: EncuestaDto) {
    for (const k of ['p1', 'p2', 'p3', 'p4', 'p5'] as const) {
      const v = Number(dto?.[k]);
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        throw new BadRequestException('Cada respuesta debe ser un número del 1 al 5.');
      }
    }
    const existe = await this.repo.findOne({ where: { userId: user.id } });
    if (existe) throw new ConflictException('Ya respondiste la encuesta. ¡Gracias!');

    await this.repo.save(this.repo.create({
      userId: user.id,
      p1: Number(dto.p1), p2: Number(dto.p2), p3: Number(dto.p3),
      p4: Number(dto.p4), p5: Number(dto.p5),
    }));
    return { ok: true, mensaje: 'Gracias por tu respuesta.' };
  }

  /** ADMIN: todas las respuestas (con usuario) + promedios por pregunta. */
  async respuestas() {
    const filas = await this.repo.manager.query(`
      SELECT s.id, s.user_id, u.full_name AS usuario, u.email, u.bodega,
             s.p1, s.p2, s.p3, s.p4, s.p5, s.created_at AS fecha
      FROM survey_ux s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `);
    const prom = (k: string) =>
      filas.length ? Math.round((filas.reduce((a: number, r: any) => a + Number(r[k]), 0) / filas.length) * 100) / 100 : 0;

    return {
      total: filas.length,
      promedios: { p1: prom('p1'), p2: prom('p2'), p3: prom('p3'), p4: prom('p4'), p5: prom('p5') },
      respuestas: filas,
    };
  }
}
