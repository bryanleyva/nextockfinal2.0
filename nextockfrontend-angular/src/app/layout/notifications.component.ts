import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FilaReporte } from '../core/models';

interface Alerta { tipo: 'DEFICIT' | 'SOBRE'; icono: string; titulo: string; detalle: string; }

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    .bell { position: relative; background: none; border: none; color: #fff; font-size: 1.4rem; cursor: pointer; }
    .badge { position: absolute; top: -6px; right: -8px; background: var(--alerta); color: #fff;
      border-radius: 10px; font-size: .7rem; padding: 1px 6px; font-weight: 700; }
    .panel-n { position: absolute; right: 0; top: 44px; width: 340px; max-height: 420px; overflow-y: auto;
      background: #fff; color: var(--text); border: 1px solid var(--borde); border-radius: 12px;
      box-shadow: 0 14px 40px rgba(0,0,0,.18); z-index: 50; }
    .head { padding: 12px 16px; border-bottom: 1px solid var(--borde); font-weight: 700; color: var(--teal); }
    .item { padding: 12px 16px; border-bottom: 1px solid var(--borde); display: flex; gap: 10px; }
    .item .ico { font-size: 1.2rem; }
    .item .t { font-weight: 600; font-size: .9rem; }
    .item .d { font-size: .82rem; color: var(--muted); }
    .empty { padding: 18px 16px; color: var(--muted); font-size: .9rem; }
    .wrap { position: relative; }
  `],
  template: `
    <div class="wrap">
      <button class="bell" (click)="abierto.set(!abierto())" title="Notificaciones de stock">
        🔔<span class="badge" *ngIf="alertas().length">{{ alertas().length }}</span>
      </button>
      <div class="panel-n" *ngIf="abierto()">
        <div class="head">Notificaciones de stock</div>
        <div *ngIf="!alertas().length" class="empty">No hay alertas. Tu inventario está en orden ✅</div>
        <a *ngFor="let a of alertas()" class="item" routerLink="/app/analisis" (click)="abierto.set(false)" style="text-decoration:none;color:inherit;">
          <span class="ico">{{ a.icono }}</span>
          <span><span class="t" [style.color]="a.tipo==='DEFICIT' ? 'var(--alerta)' : 'var(--ambar)'">{{ a.titulo }}</span><br/><span class="d">{{ a.detalle }}</span></span>
        </a>
      </div>
    </div>
  `,
})
export class NotificationsComponent {
  private api = inject(ApiService);
  abierto = signal(false);
  alertas = signal<Alerta[]>([]);

  constructor() {
    this.api.reporteInventario().subscribe({
      next: (r) => this.alertas.set(this.construir(r.productos)),
      error: () => this.alertas.set([]), // bodega sin datos: sin alertas
    });
  }

  private construir(prods: FilaReporte[]): Alerta[] {
    const alertas: Alerta[] = [];
    for (const p of prods) {
      if (p.estado === 'DEFICIT') {
        const q = p.dias_hasta_quiebre ? `, quiebre en ${p.dias_hasta_quiebre} día(s)` : '';
        alertas.push({ tipo: 'DEFICIT', icono: '⚠️', titulo: `Déficit: ${p.nombre}`,
          detalle: `Stock ${p.stock_actual}. Pedir ${p.cantidad_recomendada_pedir} uds${q}.` });
      } else if (p.estado === 'SOBRE STOCK') {
        alertas.push({ tipo: 'SOBRE', icono: '📦', titulo: `Sobre stock: ${p.nombre}`,
          detalle: `Stock ${p.stock_actual}. Reducir compras de este producto.` });
      }
    }
    // primero los déficit (más urgentes)
    return alertas.sort((a, b) => (a.tipo === 'DEFICIT' ? -1 : 1) - (b.tipo === 'DEFICIT' ? -1 : 1));
  }
}
