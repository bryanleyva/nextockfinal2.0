// URL base del backend NestJS.
//  - En desarrollo (ng serve, puerto 4200): apunta al backend en el mismo host, puerto 3000.
//  - En despliegue (Angular servido por NestJS): usa la misma URL/origen ('/api'),
//    así funciona con cualquier IP de la red local sin reconfigurar nada.
export const API_BASE =
  typeof location !== 'undefined' && (location.port === '4200' || location.port === '4300')
    ? `http://${location.hostname}:3000/api`
    : '/api';

// Origen del backend (sin /api) para construir URLs de imágenes subidas.
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');

/** Convierte una ruta del backend (ej. /uploads/...) en URL completa usable en <img>. */
export function assetUrl(ruta: string | null | undefined): string {
  return ruta ? API_ORIGIN + ruta : '';
}
