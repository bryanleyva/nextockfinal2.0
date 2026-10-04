import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'administrador',        // nosotros: ve todas las bodegas, usuarios e info
  GESTOR = 'gestor',              // bodeguero: ingresa y manipula los datos de SU bodega
  VISUALIZADOR = 'visualizador',  // solo consulta reportes (lectura)
}

/**
 * Usuario del sistema (HU-23 login, HU-24 registro, HU-15 perfil).
 */
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string; // hash bcrypt (no se devuelve por defecto)

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  bodega: string; // nombre de la bodega/tienda

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl: string; // ruta del avatar, ej. /uploads/avatars/u1_123.png

  @Column({ type: 'enum', enum: UserRole, default: UserRole.GESTOR })
  role: UserRole;

  // HU-23 Escenario 3: bloqueo de la cuenta por intentos fallidos de inicio de sesion
  @Column({ name: 'intentos_fallidos', type: 'int', default: 0 })
  intentosFallidos: number;

  @Column({ default: false })
  bloqueado: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
