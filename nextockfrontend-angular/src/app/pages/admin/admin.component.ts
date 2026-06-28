import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { EncuestaComponent } from '../../shared/encuesta.component';

interface BodegaAdmin {
  id: number; nombre: string; email: string; bodega: string | null;
  rol: string; registrado: string;
  productos: number; dias_datos: number; ultima_fecha: string | null;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, EncuestaComponent],
  styles: [`
    .rolsel { padding:6px 10px; border:1px solid var(--borde-fuerte); border-radius:18px; background:#fff; font-family:inherit; font-size:.85rem; color:var(--text); }
    .badge { padding:3px 10px; border-radius:12px; font-size:.72rem; font-weight:700; color:#fff; }
    .b-admin { background:var(--teal); } .b-gestor { background:var(--ok); } .b-vis { background:var(--ambar); }
    .small { font-size:.82rem; color:var(--muted); }
  `],
  template: `
    <h2 class="page-title">Administración</h2>
    <p class="page-sub">Bodegas registradas, sus datos y los usuarios del sistema</p>

    <div class="metrics">
      <div class="metric"><div class="v">{{ bodegas().length }}</div><div class="l">Bodegas / usuarios</div></div>
      <div class="metric"><div class="v">{{ conDatos() }}</div><div class="l">Con datos cargados</div></div>
      <div class="metric"><div class="v">{{ admins() }}</div><div class="l">Administradores</div></div>
    </div>

    <div class="panel">
      <h3>Bodegas y usuarios</h3>
      <p *ngIf="msg()" class="msg" [class.ok]="ok()" [class.error]="!ok()" style="text-align:left">{{ msg() }}</p>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr>
            <th>Usuario</th><th>Correo</th><th>RUC / Bodega</th><th>Rol</th>
            <th>Productos</th><th>Días de datos</th><th>Últimos datos</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let b of bodegas()">
              <td>{{ b.nombre }}</td>
              <td class="small">{{ b.email }}</td>
              <td>{{ b.bodega || '—' }}</td>
              <td>
                <select class="rolsel" [ngModel]="b.rol" (ngModelChange)="cambiarRol(b, $event)">
                  <option value="administrador">Administrador</option>
                  <option value="gestor">Bodeguero</option>
                  <option value="visualizador">Visualizador</option>
                </select>
              </td>
              <td>{{ b.productos }}</td>
              <td>{{ b.dias_datos }}</td>
              <td class="small">{{ b.ultima_fecha ? (fmt(b.ultima_fecha)) : 'sin datos' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!bodegas().length" class="center small" style="margin-top:10px;">No hay bodegas registradas todavía.</p>
    </div>

    <!-- Vista previa del formulario de encuesta (no guarda) -->
    <app-encuesta #enc [autoCheck]="false" [preview]="true" />

    <!-- Encuesta de Experiencia de Usuario -->
    <div class="panel" *ngIf="encuesta() as e">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <h3 style="margin-bottom:0;">📋 Encuesta de Experiencia de Usuario <span class="small">({{ e.total }} respuesta{{ e.total === 1 ? '' : 's' }})</span></h3>
        <button class="btn-ghost" (click)="enc.abrir()">👁️ Ver formulario</button>
      </div>
      <p class="small" style="margin:6px 0 14px;">Así se ve el formulario que reciben los usuarios al 5° día.</p>
      <div *ngIf="e.total" class="metrics" style="margin-bottom:18px;">
        <div class="metric" *ngFor="let c of cols"><div class="v">{{ e.promedios[c.k] }}<span class="small">/5</span></div><div class="l">{{ c.t }}</div></div>
      </div>
      <div *ngIf="e.total" style="overflow-x:auto;">
        <table>
          <thead><tr><th>Usuario</th><th>Bodega</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th><th>P5</th><th>Fecha</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of e.respuestas">
              <td>{{ r.usuario }}<br><span class="small">{{ r.email }}</span></td>
              <td>{{ r.bodega || '—' }}</td>
              <td>{{ r.p1 }}</td><td>{{ r.p2 }}</td><td>{{ r.p3 }}</td><td>{{ r.p4 }}</td><td>{{ r.p5 }}</td>
              <td class="small">{{ fmt(r.fecha) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!e.total" class="center small" style="margin-top:6px;">Aún no hay respuestas. Aparecen al 5° día desde el registro de cada usuario.</p>
    </div>
  `,
})
export class AdminComponent {
  private api = inject(ApiService);
  bodegas = signal<BodegaAdmin[]>([]);
  encuesta = signal<any>(null);
  msg = signal(''); ok = signal(true);
  cols = [
    { k: 'p1', t: 'Facilidad de uso' },
    { k: 'p2', t: 'Gráficos claros' },
    { k: 'p3', t: 'Rapidez (XGBoost)' },
    { k: 'p4', t: 'Utilidad recom.' },
    { k: 'p5', t: 'Satisfacción' },
  ];

  constructor() { this.cargar(); }

  cargar() {
    this.api.adminBodegas().subscribe({
      next: (b) => this.bodegas.set(b || []),
      error: (e) => { this.ok.set(false); this.msg.set(e.error?.message || 'No se pudieron cargar las bodegas'); },
    });
    this.api.encuestaRespuestas().subscribe({
      next: (e) => this.encuesta.set(e),
      error: () => {},
    });
  }

  conDatos() { return this.bodegas().filter((b) => Number(b.dias_datos) > 0).length; }
  admins() { return this.bodegas().filter((b) => b.rol === 'administrador').length; }

  cambiarRol(b: BodegaAdmin, rol: string) {
    const anterior = b.rol;
    this.api.cambiarRol(b.id, rol).subscribe({
      next: () => { b.rol = rol; this.ok.set(true); this.msg.set(`Rol de ${b.nombre} actualizado a ${rol}.`); },
      error: (e) => { b.rol = anterior; this.ok.set(false); this.msg.set(e.error?.message || 'No se pudo cambiar el rol'); },
    });
  }

  fmt(f: string): string {
    const d = String(f).slice(0, 10).split('-');
    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : f;
  }
}
