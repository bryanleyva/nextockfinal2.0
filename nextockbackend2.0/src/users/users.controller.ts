import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { IsOptional, IsString } from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

class UpdatePerfilDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() bodega?: string;
}

export const AVATAR_DIR = path.join(process.cwd(), 'uploads', 'avatars');

/**
 * HU-15: ver y editar mi perfil, incluyendo la foto (avatar).
 */
@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('perfil')
  perfil(@GetUser() user: User) {
    return this.map(user);
  }

  @Patch('perfil')
  async actualizar(@GetUser() user: User, @Body() dto: UpdatePerfilDto) {
    const actualizado = await this.users.updatePerfil(user.id, dto);
    return this.map(actualizado);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(AVATAR_DIR, { recursive: true });
          cb(null, AVATAR_DIR);
        },
        filename: (req: any, file, cb) => {
          const ext = path.extname(file.originalname) || '.png';
          cb(null, `u${req.user.id}_${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
      fileFilter: (_req, file, cb) => {
        cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype));
      },
    }),
  )
  async subirAvatar(@GetUser() user: User, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Sube una imagen válida (png, jpg, webp)');
    const photoUrl = `/uploads/avatars/${file.filename}`;
    const actualizado = await this.users.updatePerfil(user.id, { photoUrl });
    return this.map(actualizado);
  }

  private map(u: User) {
    return {
      id: u.id,
      email: u.email,
      nombre: u.fullName,
      telefono: u.phone,
      bodega: u.bodega,
      rol: u.role,
      foto: u.photoUrl,
      registrado: u.createdAt,
    };
  }
}
