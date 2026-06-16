import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_BASE } from './config';
import { SesionResp } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // Señal reactiva con el usuario actual (para la barra superior)
  usuario = signal<SesionResp['usuario'] | null>(this.leerUsuario());

  login(email: string, password: string) {
    return this.http
      .post<SesionResp>(`${API_BASE}/auth/login`, { email, password })
      .pipe(tap((r) => this.guardar(r)));
  }

  registrar(dto: { fullName: string; email: string; password: string; bodega?: string }) {
    return this.http
      .post<SesionResp>(`${API_BASE}/auth/registro`, dto)
      .pipe(tap((r) => this.guardar(r)));
  }

  cambiarPassword(actual: string, nueva: string) {
    return this.http.post(`${API_BASE}/auth/cambiar-password`, { actual, nueva });
  }

  private guardar(r: SesionResp) {
    localStorage.setItem('nx_token', r.access_token);
    localStorage.setItem('nx_user', JSON.stringify(r.usuario));
    this.usuario.set(r.usuario);
  }

  private leerUsuario(): SesionResp['usuario'] | null {
    const u = localStorage.getItem('nx_user');
    return u ? JSON.parse(u) : null;
  }

  get token() { return localStorage.getItem('nx_token'); }
  get logueado() { return !!this.token; }

  /** Rol del usuario actual (por defecto 'gestor' si no viene). */
  get rol(): string { return this.usuario()?.rol || 'gestor'; }
  get esAdmin() { return this.rol === 'administrador'; }
  get esGestor() { return this.rol === 'gestor'; }
  get esVisualizador() { return this.rol === 'visualizador'; }
  /** Puede escribir datos (subir CSV, registrar movimientos). */
  get puedeEditar() { return this.esGestor || this.esAdmin; }

  salir() {
    localStorage.removeItem('nx_token');
    localStorage.removeItem('nx_user');
    this.usuario.set(null);
  }
}
