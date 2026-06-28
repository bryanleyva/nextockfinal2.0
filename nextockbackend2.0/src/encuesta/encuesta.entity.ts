import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Respuesta de la encuesta de Experiencia de Usuario (validación de la tesis).
 * Una respuesta por usuario (índice único en user_id). Cada p1..p5 es 1-5.
 */
@Entity({ name: 'survey_ux' })
export class SurveyUx {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId: number;

  @Column() p1: number; // registro/login/carga de archivo
  @Column() p2: number; // gráficos y tooltips fáciles de comprender
  @Column() p3: number; // rapidez del procesamiento (XGBoost < 10s)
  @Column() p4: number; // utilidad de las recomendaciones
  @Column() p5: number; // satisfacción general

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
