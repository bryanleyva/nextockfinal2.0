import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './config';
import { Finanzas, Metricas, Perfil, Producto, Reporte, Series } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ---- Perfil (HU-15) ----
  perfil() { return this.http.get<Perfil>(`${API_BASE}/usuarios/perfil`); }

  actualizarPerfil(dto: { fullName?: string; phone?: string; bodega?: string }) {
    return this.http.patch<Perfil>(`${API_BASE}/usuarios/perfil`, dto);
  }

  subirAvatar(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Perfil>(`${API_BASE}/usuarios/avatar`, fd);
  }

  // ---- Encuesta de Experiencia de Usuario (validación) ----
  encuestaPendiente() {
    return this.http.get<{ mostrar: boolean; motivo?: string; dias_desde_registro?: number; dias_requeridos?: number }>(
      `${API_BASE}/encuesta/pendiente`,
    );
  }
  enviarEncuesta(dto: { p1: number; p2: number; p3: number; p4: number; p5: number }) {
    return this.http.post<{ ok: boolean; mensaje?: string }>(`${API_BASE}/encuesta`, dto);
  }
  encuestaRespuestas() {
    return this.http.get<{ total: number; promedios: any; respuestas: any[] }>(`${API_BASE}/encuesta/admin/respuestas`);
  }

  // ---- Administración (solo rol administrador) ----
  adminBodegas() { return this.http.get<any[]>(`${API_BASE}/usuarios/admin/bodegas`); }
  cambiarRol(id: number, rol: string) {
    return this.http.patch<any>(`${API_BASE}/usuarios/admin/usuarios/${id}/rol`, { rol });
  }

  // ---- Inventario / dashboard ----
  metricas() { return this.http.get<Metricas>(`${API_BASE}/inventario/metricas`); }
  ventas(desde?: string, hasta?: string) {
    let q = '';
    if (desde) q += `?desde=${desde}`;
    if (hasta) q += `${q ? '&' : '?'}hasta=${hasta}`;
    return this.http.get<{ datos: { fecha: string; ingreso: number; unidades: number }[]; mensaje?: string }>(
      `${API_BASE}/inventario/ventas${q}`,
    );
  }

  // ---- Productos ----
  productos(categoria?: string) {
    const q = categoria ? `?categoria=${encodeURIComponent(categoria)}` : '';
    return this.http.get<Producto[]>(`${API_BASE}/productos${q}`);
  }
  buscar(q: string) {
    return this.http.get<{ productos: Producto[]; mensaje?: string }>(
      `${API_BASE}/productos/buscar?q=${encodeURIComponent(q)}`,
    );
  }
  categorias() { return this.http.get<string[]>(`${API_BASE}/productos/categorias`); }

  // ---- Historial de análisis (HU-02) ----
  guardarHistorial(dto: { tipo: string; titulo: string; resumen: any }) {
    return this.http.post<any>(`${API_BASE}/historial`, dto);
  }
  historial() {
    return this.http.get<{ items: any[]; mensaje?: string }>(`${API_BASE}/historial`);
  }

  // ---- Soporte (HU-07, HU-19, HU-20) ----
  encargados() { return this.http.get<any>(`${API_BASE}/soporte/encargados`); }
  contacto(dto: { nombre: string; email: string; mensaje: string }) {
    return this.http.post<any>(`${API_BASE}/soporte/contacto`, dto);
  }
  compartir(dto: { destinatario: string; asunto?: string; reporte?: string }) {
    return this.http.post<any>(`${API_BASE}/soporte/compartir`, dto);
  }

  // ---- Análisis (ML) ----
  prediccion(sku: string) { return this.http.get<any>(`${API_BASE}/analisis/prediccion/${sku}`); }
  series(sku: string) { return this.http.get<Series>(`${API_BASE}/analisis/series/${sku}`); }
  reporteInventario() { return this.http.get<Reporte>(`${API_BASE}/analisis/reporte-inventario`); }
  finanzas() { return this.http.get<Finanzas>(`${API_BASE}/analisis/finanzas`); }
  ranking() {
    return this.http.get<{ ranking: { sku: string; nombre: string; unidades_vendidas: number }[] }>(
      `${API_BASE}/analisis/ranking`,
    );
  }

  // ---- Subir CSV ----
  subirProductos(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<any>(`${API_BASE}/datos/productos`, fd);
  }
  subirHechos(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<any>(`${API_BASE}/datos/hechos`, fd);
  }

  // ---- Inventario al día: movimientos manuales y frescura de datos ----
  registrarMovimiento(dto: { productId: number; tipo: 'venta' | 'ingreso' | 'ajuste'; cantidad: number; fecha?: string }) {
    return this.http.post<{
      ok: boolean;
      producto: { id: number; sku: string; nombre: string };
      fecha: string; tipo: string; cantidad: number;
      stock_anterior: number; stock_actual: number; reentrenando?: boolean;
    }>(`${API_BASE}/datos/movimiento`, dto);
  }

  estadoDatos() {
    return this.http.get<{
      sin_datos: boolean;
      ultima_fecha?: string; primera_fecha?: string | null;
      dias_desde_ultima?: number; total_dias?: number; productos?: number; desactualizado?: boolean;
    }>(`${API_BASE}/datos/estado`);
  }
}
