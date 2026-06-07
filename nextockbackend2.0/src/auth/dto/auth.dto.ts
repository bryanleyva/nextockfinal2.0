import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** HU-24: registro de usuario. */
export class RegisterDto {
  @IsString()
  fullName: string;

  @IsEmail({}, { message: 'Ingrese un correo valido' })
  email: string;

  @MinLength(6, { message: 'La contrasena debe tener al menos 6 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  bodega?: string;
}

/** HU-23: iniciar sesion. */
export class LoginDto {
  @IsEmail({}, { message: 'Ingrese un correo valido' })
  email: string;

  @IsString()
  password: string;
}

/** HU-25: cambio de contrasena. */
export class ChangePasswordDto {
  @IsString()
  actual: string;

  @MinLength(6, { message: 'La nueva contrasena debe tener al menos 6 caracteres' })
  nueva: string;
}
