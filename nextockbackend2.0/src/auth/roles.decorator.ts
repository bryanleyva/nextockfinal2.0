import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

export const ROLES_KEY = 'roles';

/** Restringe un endpoint (o controlador) a ciertos roles. Ej: @Roles(UserRole.GESTOR). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
