import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * HU-02: historial de análisis. Guarda una "foto" de cada análisis generado
 * por la bodega para poder compararlos en el tiempo.
 */
@Entity({ name: 'analysis_history' })
export class AnalysisHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'store_id' })
  storeId: number;

  @Column()
  tipo: string; // 'financiero' | 'inventario'

  @Column()
  titulo: string;

  @Column({ type: 'jsonb' })
  resumen: any; // métricas clave del análisis (JSON)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
