/**
 * Formato de números y moneda unificado para toda la app.
 * Regla: miles con coma y decimales con punto (formato 1,234.56), símbolo S/ en dinero.
 * Se fuerza el locale 'en-US' para garantizar ese formato sin importar el navegador.
 */
const LOCALE = 'en-US';

/** Dinero: "S/ 1,234.56" (2 decimales). */
export function dinero(v: any, dec = 2): string {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  return 'S/ ' + n.toLocaleString(LOCALE, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/** Número con miles: "1,234" o "1,234.56". */
export function numero(v: any, dec = 0): string {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  return n.toLocaleString(LOCALE, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/** Porcentaje: "30.36%". */
export function porcentaje(v: any, dec = 2): string {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  return n.toLocaleString(LOCALE, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + '%';
}
