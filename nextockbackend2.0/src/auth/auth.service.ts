import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /** HU-24: Registro de usuario. */
  async register(dto: RegisterDto) {
    const existe = await this.users.findByEmail(dto.email);
    if (existe) {
      // HU-24 Escenario 3: usuario ya registrado
      throw new ConflictException('Usuario ya registrado');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      fullName: dto.fullName,
      email: dto.email,
      password: hash,
      bodega: dto.bodega,
    });
    return this.firmarToken(user.id, user.email, user.fullName);
  }

  /** HU-23: Iniciar sesion. */
  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      // HU-23 Escenario 2: credenciales invalidas
      throw new UnauthorizedException('Usuario o contrasena incorrectos');
    }
    return this.firmarToken(user.id, user.email, user.fullName);
  }

  /** HU-25: Cambio de contrasena. */
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.users.findByEmailWithPassword(
      (await this.users.findById(userId)).email,
    );
    if (!user || !(await bcrypt.compare(dto.actual, user.password))) {
      throw new UnauthorizedException('La contrasena actual no es correcta');
    }
    const hash = await bcrypt.hash(dto.nueva, 10);
    await this.users.updatePassword(userId, hash);
    return { mensaje: 'Contrasena actualizada correctamente' };
  }

  private firmarToken(id: number, email: string, nombre: string) {
    const token = this.jwt.sign({ sub: id, email });
    return {
      access_token: token,
      usuario: { id, email, nombre },
    };
  }
}
