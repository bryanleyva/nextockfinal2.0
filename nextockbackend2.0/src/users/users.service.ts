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
             u.bloqueado,
             u.created_at        AS registrado,
             (SELECT COUNT(*) FROM product p WHERE p.store_id = u.id)                              AS productos,
             (SELECT COUNT(DISTINCT f.record_date) FROM fact_sales_inventory f WHERE f.store_id = u.id) AS dias_datos,
             (SELECT MAX(f.record_date) FROM fact_sales_inventory f WHERE f.store_id = u.id)       AS ultima_fecha
      FROM users u
      ORDER BY u.created_at DESC
    `);
  }

  /**
   * HU-23 Escenario 3: suma un intento fallido de inicio de sesion y bloquea la cuenta
   * al llegar al maximo. Devuelve el numero de intentos acumulados.
   */
  async registrarIntentoFallido(id: number, maximo: number): Promise<number> {
    const [fila] = await this.repo.manager.query(
      `UPDATE users SET intentos_fallidos = intentos_fallidos + 1,
              bloqueado = (intentos_fallidos + 1 >= $2)
        WHERE id = $1 RETURNING intentos_fallidos`,
      [id, maximo],
    );
    return Number((Array.isArray(fila) ? fila[0] : fila)?.intentos_fallidos ?? 0);
  }

  /** Inicio de sesion correcto: el contador de intentos vuelve a cero. */
  async reiniciarIntentos(id: number): Promise<void> {
    await this.repo.update({ id }, { intentosFallidos: 0 });
  }

  /** ADMIN: desbloquea una cuenta bloqueada por intentos fallidos. */
  async desbloquear(id: number): Promise<User> {
    await this.findById(id);
    await this.repo.update({ id }, { bloqueado: false, intentosFallidos: 0 });
    return this.findById(id);
  }

  /** ADMIN: cambia el rol de un usuario. */
  async cambiarRol(id: number, rol: User['role']): Promise<User> {
    await this.repo.update({ id }, { role: rol });
    return this.findById(id);
  }
}
