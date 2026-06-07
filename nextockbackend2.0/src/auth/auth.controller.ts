import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // HU-24: Registro de usuario
  @Post('registro')
  registro(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // HU-23: Iniciar sesion
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // HU-25: Cambio de contrasena
  @Post('cambiar-password')
  @UseGuards(JwtAuthGuard)
  cambiarPassword(@GetUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }
}
