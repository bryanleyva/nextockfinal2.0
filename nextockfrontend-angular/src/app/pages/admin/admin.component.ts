import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

interface BodegaAdmin {
  id: number; nombre: string; email: string; bodega: string | null;
  rol: string; registrado: string;
  productos: number; dias_datos: number; ultima_fecha: string | null;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  `,
})
export class AdminComponent {
  private api = inject(ApiService);
  bodegas = signal<BodegaAdmin[]>([]);
  msg = signal(''); ok = signal(true);

  constructor() { this.cargar(); }

  cargar() {
    this.api.adminBodegas().subscribe({
      next: (b) => this.bodegas.set(b || []),
      error: (e) => { this.ok.set(false); this.msg.set(e.error?.message || 'No se pudieron cargar las bodegas'); },
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
