import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';

/** HU-23 Escenario 3: intentos fallidos permitidos antes de bloquear la cuenta. */
export const MAX_INTENTOS_LOGIN = Number(process.env.MAX_INTENTOS_LOGIN || 5);
export const MENSAJE_BLOQUEO = 'Cuenta bloqueada, contacte al administrador';

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
    // HU-24: si el campo de la bodega es un RUC (solo digitos), debe tener 11 digitos.
    // El formulario ya lo valida; esto evita que la API acepte un RUC invalido enviado directamente.
    const bodega = dto.bodega?.trim();
    if (bodega && /^\d+$/.test(bodega) && bodega.length !== 11) {
      throw new BadRequestException('El RUC debe tener exactamente 11 dígitos');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      fullName: dto.fullName,
      email: dto.email,
      password: hash,
      bodega: dto.bodega,
    });
    return this.firmarToken(user.id, user.email, user.fullName, user.role);
  }

  /** HU-23: Iniciar sesion. */
  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user) {
      // HU-23 Escenario 2: credenciales invalidas
      throw new UnauthorizedException('Usuario o contrasena incorrectos');
    }
    if (user.bloqueado) {
      // HU-23 Escenario 3: cuenta bloqueada (solo el administrador la desbloquea)
      throw new ForbiddenException(MENSAJE_BLOQUEO);
    }
    if (!(await bcrypt.compare(dto.password, user.password))) {
      const intentos = await this.users.registrarIntentoFallido(user.id, MAX_INTENTOS_LOGIN);
      if (intentos >= MAX_INTENTOS_LOGIN) {
        throw new ForbiddenException(MENSAJE_BLOQUEO);
      }
      throw new UnauthorizedException('Usuario o contrasena incorrectos');
    }
    if (user.intentosFallidos > 0) await this.users.reiniciarIntentos(user.id);
    return this.firmarToken(user.id, user.email, user.fullName, user.role);
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

  private firmarToken(id: number, email: string, nombre: string, rol: string) {
    const token = this.jwt.sign({ sub: id, email });
    return {
      access_token: token,
      usuario: { id, email, nombre, rol },
    };
  }
}
