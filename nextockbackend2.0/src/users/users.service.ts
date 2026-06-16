import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  /** Incluye el hash de contrasena (para validar el login). */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email })
      .getOne();
  }

  async findById(id: number): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updatePassword(id: number, hash: string): Promise<void> {
    await this.repo.update({ id }, { password: hash });
  }

  /** HU-15: actualizar datos del perfil. */
  async updatePerfil(id: number, datos: Partial<User>): Promise<User> {
    const permitido: Partial<User> = {};
    if (datos.fullName !== undefined) permitido.fullName = datos.fullName;
    if (datos.phone !== undefined) permitido.phone = datos.phone;
    if (datos.bodega !== undefined) permitido.bodega = datos.bodega;
    if (datos.photoUrl !== undefined) permitido.photoUrl = datos.photoUrl;
    await this.repo.update({ id }, permitido);
    return this.findById(id);
  }

  /**
   * ADMIN: lista todas las bodegas registradas (cada usuario es una bodega) con
   * un resumen de su información (rol, productos cargados, días de datos, etc.).
   */
  async listarBodegas(): Promise<any[]> {
    return this.repo.manager.query(`
      SELECT u.id,
             u.full_name        AS nombre,
             u.email,
             u.bodega,
             u.role             AS rol,
             u.created_at        AS registrado,
             (SELECT COUNT(*) FROM product p WHERE p.store_id = u.id)                              AS productos,
             (SELECT COUNT(DISTINCT f.record_date) FROM fact_sales_inventory f WHERE f.store_id = u.id) AS dias_datos,
             (SELECT MAX(f.record_date) FROM fact_sales_inventory f WHERE f.store_id = u.id)       AS ultima_fecha
      FROM users u
      ORDER BY u.created_at DESC
    `);
  }

  /** ADMIN: cambia el rol de un usuario. */
  async cambiarRol(id: number, rol: User['role']): Promise<User> {
    await this.repo.update({ id }, { role: rol });
    return this.findById(id);
  }
}
