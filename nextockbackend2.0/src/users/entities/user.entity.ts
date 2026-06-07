import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'administrador',
  GESTOR = 'gestor',
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
