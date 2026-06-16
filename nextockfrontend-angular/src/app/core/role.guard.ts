import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Restringe rutas por rol. Define los roles permitidos en la ruta:
 *   { path: 'procesar', component: ..., canActivate: [roleGuard], data: { roles: ['gestor','administrador'] } }
 * Si el rol no coincide, redirige a Inicio.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.logueado) { router.navigate(['/login']); return false; }
  const roles = (route.data?.['roles'] as string[]) || [];
  if (roles.length === 0 || roles.includes(auth.rol)) return true;
  router.navigate(['/app/inicio']);
  return false;
};
