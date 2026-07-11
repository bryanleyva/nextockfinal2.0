import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { Metricas } from '../../core/models';
import { HelpComponent } from '../../shared/help.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink, HelpComponent],
  styles: [`
    .frescura { display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap;
      max-width:560px; margin:0 auto 22px; padding:10px 18px; border-radius:30px; font-size:.9rem;
      background:var(--teal-soft); color:var(--teal-dark); border:1px solid var(--borde); }
    .frescura.viejo { background:#fff7ed; color:#9a3412; border-color:#fed7aa; }
    .frescura a { white-space:nowrap; }
  `],
  template: `
    <div class="center" style="padding:20px 0 6px;">
      <h1 style="color:var(--teal);font-size:2.6rem;">¡Bienvenido, {{ auth.usuario()?.nombre }}!</h1>
      <p style="color:var(--muted);margin-top:6px;">Estado rápido de tu bodega</p>
    </div>

    <!-- Frescura de los datos: avisa si el inventario está desactualizado -->
    <div *ngIf="estado() as e">
      <div *ngIf="!e.sin_datos" class="frescura" [class.viejo]="e.desactualizado">
        <span>🗓️ Datos al <b>{{ fmtFecha(e.ultima_fecha) }}</b><ng-container *ngIf="e.dias_desde_ultima"> · hace {{ e.dias_desde_ultima }} día{{ e.dias_desde_ultima === 1 ? '' : 's' }}</ng-container></span>
        <a routerLink="/app/inventario" class="link">{{ e.desactualizado ? 'Actualízalos ahora →' : 'Actualizar inventario →' }}</a>
      </div>
    </div>

    <div *ngIf="m() as x">
      <div *ngIf="x.sin_datos" class="aviso">
        Aún no tienes datos. Comienza en <a routerLink="/app/procesar"><b>Procesar BD</b></a> subiendo tu CSV de ventas.
      </div>
      <div *ngIf="!x.sin_datos" class="metrics">
        <div class="metric"><div class="v">{{ x.productos_total }}</div><div class="l">Productos</div></div>
        <div class="metric"><div class="v">{{ x.unidades_en_stock }}</div><div class="l">Unidades en stock</div></div>
        <div class="metric"><div class="v">S/ {{ x.valor_inventario | number:'1.2-2' }}</div><div class="l">Valor inventario</div></div>
        <div class="metric"><div class="v" style="color:var(--ambar)">{{ x.productos_bajo_stock }}</div><div class="l">Bajo stock <app-help texto="Productos con 10 unidades o menos. Conviene vigilarlos para no quedarte sin stock."/></div></div>
        <div class="metric"><div class="v" style="color:var(--alerta)">{{ x.productos_agotados }}</div><div class="l">Agotados</div></div>
        <div class="metric"><div class="v">{{ x.tasa_quiebre_pct }}%</div><div class="l">Tasa de quiebre <app-help texto="Porcentaje de productos que están en cero (sin stock) respecto al total."/></div></div>
      </div>
    </div>

    <div class="choices" style="margin-top:10px;">
      <a class="choice" routerLink="/app/analisis" style="text-decoration:none;"><div class="emoji">📊</div><div class="cap">Ver análisis</div></a>
      <a class="choice" routerLink="/app/prediccion" style="text-decoration:none;"><div class="emoji">📈</div><div class="cap">Predicciones</div></a>
      <a class="choice" routerLink="/app/inventario" style="text-decoration:none;"><div class="emoji">🔎</div><div class="cap">Inventario</div></a>
    </div>
  `,
})
export class InicioComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);
  m = signal<Metricas | null>(null);
  estado = signal<any | null>(null);
  constructor() {
    this.api.metricas().subscribe((m) => this.m.set(m));
    this.api.estadoDatos().subscribe((e) => this.estado.set(e));
  }
  fmtFecha(f?: string): string {
    if (!f) return '';
    const [y, m, d] = f.split('-');
    return `${d}/${m}/${y}`;
  }
}
