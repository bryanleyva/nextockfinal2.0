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
}
