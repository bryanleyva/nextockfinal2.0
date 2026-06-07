import { HttpInterceptorFn } from '@angular/common/http';

/** Agrega el token JWT (Bearer) a todas las peticiones si existe. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('nx_token');
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
