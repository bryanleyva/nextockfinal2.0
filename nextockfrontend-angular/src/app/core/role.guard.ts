import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Restringe rutas por rol. Define los roles permitidos en la ruta:
 *   { path: 'procesar', component: ..., canActivate: [roleGuard], data: { roles: ['gestor','administrador'] } }
 * Antes de decidir relee el rol desde el servidor (por si el administrador lo cambió con la
 * sesión abierta). Si el rol no coincide, redirige a Inicio.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.logueado) { router.navigate(['/login']); return false; }
  const roles = (route.data?.['roles'] as string[]) || [];
  if (roles.length === 0) return true;
  const decidir = () => {
    if (roles.includes(auth.rol)) return true;
    router.navigate(['/app/inicio']);
    return false;
  };
  return auth.refrescarUsuario().pipe(map(decidir), catchError(() => of(decidir())));
};
