import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { ApiService } from '../../core/api.service';
import { Producto, Series } from '../../core/models';
import { optDemanda, optStock } from '../../core/charts';
import { HelpComponent } from '../../shared/help.component';

type Paso = 'select' | 'menu' | 'stock' | 'ventas' | 'detalle';

@Component({
  selector: 'app-prediccion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HighchartsChartModule, HelpComponent],
  styles: [`.row{display:flex;gap:12px;max-width:520px;margin:0 auto 10px;align-items:center}
    .row label{font-weight:600}select{flex:1;padding:11px;border:1px solid #c9cdcf;border-radius:22px;background:#c7ccce}
    .lin{margin-bottom:8px}`],
  template: `
    <div *ngIf="vacio()" class="aviso">Aún no tienes datos. Ve a <a routerLink="/app/procesar"><b>Procesar BD</b></a>.</div>

    <!-- Paso 1: seleccionar producto -->
    <ng-container *ngIf="!vacio() && paso()==='select'">
      <h2 class="page-title">Predicción de stock</h2>
      <div class="row"><label>Producto:</label>
        <select [(ngModel)]="sku"><option *ngFor="let p of productos()" [value]="p.sourceProductId">{{p.sourceProductId}} — {{p.productName}}</option></select>
      </div>
      <div class="center"><button class="btn btn-lg" (click)="analizar()" [disabled]="cargando()">Analizar</button></div>
    </ng-container>

    <!-- Paso 2: menú -->
    <ng-container *ngIf="paso()==='menu'">
      <h2 class="page-title">¡Predicción lista!</h2>
      <p class="page-sub">¿Qué predicción deseas ver?</p>
      <div class="choices">
        <div class="choice" (click)="paso.set('stock')"><div class="emoji">📈</div><div class="cap">Predicción de stock</div></div>
        <div class="choice" (click)="paso.set('ventas')"><div class="emoji">💰</div><div class="cap">Predicción de las ventas</div></div>
      </div>
      <div class="center" style="margin-top:20px;"><button class="btn-ghost" (click)="paso.set('select')">Cambiar producto</button></div>
    </ng-container>

    <!-- Paso 3a: gráfico stock -->
    <ng-container *ngIf="paso()==='stock' && s() as serie">
      <h2 class="page-title">Predicción de stock</h2>
      <div class="panel"><highcharts-chart [Highcharts]="Highcharts" [options]="optStock" class="chart" /></div>
      <div class="center"><button class="btn" (click)="paso.set('detalle')">Detallar tu predicción</button>
        <button class="btn-ghost" (click)="paso.set('menu')" style="margin-left:10px;">Regresar</button></div>
    </ng-container>

    <!-- Paso 3b: gráfico ventas (demanda) -->
    <ng-container *ngIf="paso()==='ventas' && s() as serie">
      <h2 class="page-title">Predicción de ventas</h2>
      <div class="panel"><highcharts-chart [Highcharts]="Highcharts" [options]="optDemanda" class="chart" /></div>
      <div class="center"><button class="btn" (click)="paso.set('detalle')">Detallar tu predicción</button>
        <button class="btn-ghost" (click)="paso.set('menu')" style="margin-left:10px;">Regresar</button></div>
    </ng-container>

    <!-- Paso 4: detalle -->
    <ng-container *ngIf="paso()==='detalle' && s() as serie">
      <h2 class="page-title">Detalle de tu predicción</h2>
      <div class="panel ficha" style="max-width:640px;margin:0 auto;">
        <div class="lin"><b>Nombre del producto:</b> {{ serie.nombre }}</div>
        <div class="lin"><b>Categoría:</b> {{ serie.categoria }}</div>
        <div class="lin"><b>Stock actual:</b> {{ serie.resumen.stock_actual }} unidades</div>
        <div class="lin"><b>Demanda proyectada:</b> {{ serie.resumen.demanda_proyectada }} unidades
          <app-help texto="Total de unidades que se estima venderás en los próximos 14 días, según el modelo XGBoost."/></div>
        <div class="lin"><b>Nivel recomendado de pedido:</b> {{ serie.resumen.nivel_recomendado_pedido }} unidades
          <app-help texto="Cuántas unidades conviene comprar ahora para cubrir la demanda sin pasarte de la capacidad (máx. 60)."/></div>
        <div class="lin"><b>Probabilidad de quiebre de stock:</b> {{ serie.resumen.prob_quiebre_pct }}%
          <app-help texto="Probabilidad de quedarte sin stock durante el tiempo de reposición del proveedor. Mientras más alta, más urgente reponer."/></div>
        <div class="lin"><b>Fecha estimada de agotamiento:</b> {{ serie.resumen.fecha_agotamiento || 'No se agota en el horizonte' }}
          <app-help texto="Día estimado en que el stock llegaría a cero si no repones."/></div>
        <div style="margin-top:12px;"><span class="pill" [class]="'pill '+clase(serie.estado)">{{ serie.estado }}</span></div>
      </div>
      <div class="center"><button class="btn-ghost" (click)="paso.set('menu')">Regresar</button></div>
    </ng-container>
  `,
})
export class PrediccionComponent {
  private api = inject(ApiService);
  Highcharts: typeof Highcharts = Highcharts;
  productos = signal<Producto[]>([]);
  vacio = signal(false);
  cargando = signal(false);
  s = signal<Series | null>(null);
  paso = signal<Paso>('select');
  sku = '';
  optStock: Highcharts.Options = {};
  optDemanda: Highcharts.Options = {};

  constructor() {
    this.api.productos().subscribe((p) => {
      this.productos.set(p);
      if (!p.length) this.vacio.set(true); else this.sku = p[0].sourceProductId;
    });
  }

  analizar() {
    if (!this.sku) return;
    this.cargando.set(true);
    this.api.series(this.sku).subscribe({
      next: (serie) => {
        this.s.set(serie);
        this.optStock = optStock(serie);
        this.optDemanda = optDemanda(serie);
        this.cargando.set(false);
        this.paso.set('menu');
      },
      error: () => this.cargando.set(false),
    });
  }

  clase(e: string) { return e === 'SOBRE STOCK' ? 'SOBRE' : e; }
  ficha(s: Series) {
    const r = s.resumen;
    return `Nombre del producto: ${s.nombre}\nCategoria: ${s.categoria}\nStock actual: ${r.stock_actual} unidades\n` +
      `Demanda proyectada: ${r.demanda_proyectada} unidades\nNivel recomendado de pedido: ${r.nivel_recomendado_pedido} unidades\n` +
      `Probabilidad de quiebre de stock: ${r.prob_quiebre_pct}%\nFecha estimada de agotamiento: ${r.fecha_agotamiento || 'No se agota en el horizonte'}`;
  }
}
