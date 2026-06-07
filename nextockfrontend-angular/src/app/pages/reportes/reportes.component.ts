import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Finanzas, Reporte } from '../../core/models';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <h2>Reportes</h2>

    <div *ngIf="vacio()" class="aviso">
      Aún no hay datos para generar reportes. Ve a <a routerLink="/app/subir"><b>Subir datos</b></a>.
    </div>

    <ng-container *ngIf="!vacio()">
      <div class="panel">
        <h3>Resumen financiero</h3>
        <div class="cards" *ngIf="fin() as f">
          <div class="card"><div class="valor">S/ {{ f.ingreso_total | number:'1.0-0' }}</div><div class="etq">Ingreso total</div></div>
          <div class="card"><div class="valor">S/ {{ f.costo_total | number:'1.0-0' }}</div><div class="etq">Costo total</div></div>
          <div class="card"><div class="valor">S/ {{ f.utilidad_bruta | number:'1.0-0' }}</div><div class="etq">Utilidad bruta</div></div>
          <div class="card"><div class="valor">{{ f.margen_pct }}%</div><div class="etq">Margen bruto</div></div>
          <div class="card"><div class="valor">{{ f.unidades_vendidas | number }}</div><div class="etq">Unidades vendidas</div></div>
        </div>
      </div>

      <div class="panel">
        <h3>Reporte de inventario — sobre stock / déficit</h3>
        <table *ngIf="rep() as r">
          <thead><tr>
            <th>SKU</th><th>Producto</th><th>Estado</th><th>Stock</th>
            <th>Demanda diaria</th><th>Días a quiebre</th><th>Pedir</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let p of r.productos">
              <td>{{ p.sku }}</td>
              <td>{{ p.nombre }}</td>
              <td><span class="pill" [class]="'pill ' + clase(p.estado)">{{ p.estado }}</span></td>
              <td>{{ p.stock_actual }}</td>
              <td>{{ p.demanda_diaria_prom }}</td>
              <td>{{ p.dias_hasta_quiebre ?? '—' }}</td>
              <td>{{ p.cantidad_recomendada_pedir }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ng-container>
  `,
})
export class ReportesComponent {
  private api = inject(ApiService);
  fin = signal<Finanzas | null>(null);
  rep = signal<Reporte | null>(null);
  vacio = signal(false);

  constructor() {
    this.api.finanzas().subscribe({
      next: (f) => this.fin.set(f),
      error: () => this.vacio.set(true),
    });
    this.api.reporteInventario().subscribe({
      next: (r) => this.rep.set(r),
      error: () => this.vacio.set(true),
    });
  }

  clase(estado: string) { return estado === 'SOBRE STOCK' ? 'SOBRE' : estado; }
}
