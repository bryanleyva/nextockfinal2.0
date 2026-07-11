import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { ApiService } from '../../core/api.service';
import { Metricas } from '../../core/models';
import { optEstados, optRanking, optVentas } from '../../core/charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HighchartsChartModule],
  styles: [`.chart { display:block; width:100%; height:340px; }`],
  template: `
    <h2>Panel de control</h2>

    <div *ngIf="vacio()" class="aviso">
      Tu bodega aún no tiene datos. Ve a <a routerLink="/app/subir"><b>Subir datos</b></a> y carga tu CSV de ventas para empezar.
    </div>

    <ng-container *ngIf="!vacio()">
      <div class="cards">
        <div class="card"><div class="valor">{{ m()?.productos_total }}</div><div class="etq">Productos</div></div>
        <div class="card"><div class="valor">{{ m()?.unidades_en_stock }}</div><div class="etq">Unidades en stock</div></div>
        <div class="card"><div class="valor">S/ {{ m()?.valor_inventario | number:'1.2-2' }}</div><div class="etq">Valor inventario</div></div>
        <div class="card"><div class="valor">{{ m()?.productos_bajo_stock }}</div><div class="etq">Bajo stock</div></div>
        <div class="card"><div class="valor">{{ m()?.productos_agotados }}</div><div class="etq">Agotados</div></div>
        <div class="card"><div class="valor">{{ m()?.tasa_quiebre_pct }}%</div><div class="etq">Tasa de quiebre</div></div>
      </div>

      <div class="grid-2">
        <div class="panel"><h3>Estado del inventario</h3>
          <highcharts-chart *ngIf="optEstados" [Highcharts]="Highcharts" [options]="optEstados" class="chart" /></div>
        <div class="panel"><h3>Top productos más vendidos</h3>
          <highcharts-chart *ngIf="optRanking" [Highcharts]="Highcharts" [options]="optRanking" class="chart" /></div>
      </div>
      <div class="panel"><h3>Ventas diarias</h3>
        <highcharts-chart *ngIf="optVentas" [Highcharts]="Highcharts" [options]="optVentas" class="chart" /></div>
    </ng-container>
  `,
})
export class DashboardComponent {
  private api = inject(ApiService);
  Highcharts: typeof Highcharts = Highcharts;

  m = signal<Metricas | null>(null);
  vacio = signal(false);
  optEstados?: Highcharts.Options;
  optRanking?: Highcharts.Options;
  optVentas?: Highcharts.Options;

  constructor() {
    this.api.metricas().subscribe((m) => {
      this.m.set(m);
      if (m.sin_datos) { this.vacio.set(true); return; }
      this.api.reporteInventario().subscribe((r) => (this.optEstados = optEstados(r)));
      this.api.ranking().subscribe((r) => (this.optRanking = optRanking(r.ranking)));
      this.api.ventas().subscribe((v) => (this.optVentas = optVentas(v.datos || [])));
    });
  }
}
