import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../users/entities/user.entity';

/** Inyecta el usuario autenticado (del token JWT) en el controlador. */
export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
