import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { ApiService } from '../../core/api.service';
import { Finanzas, Reporte } from '../../core/models';
import { optEstados, optVentas, optCuellos } from '../../core/charts';
import { descargarCsv, descargarExcel, descargarPdf, Columna } from '../../core/descargas';
import { HelpComponent } from '../../shared/help.component';

type Paso = 'menu' | 'financiero' | 'administrativo';
interface FilaFin {
  sku: string; nombre: string; categoria: string;
  venta: number; compra: number; unidades: number; margen: number; ganancia: number;
}

@Component({
  selector: 'app-analisis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HighchartsChartModule, HelpComponent],
  template: `
    <div *ngIf="vacio()" class="aviso">Aún no tienes datos. Ve a <a routerLink="/app/procesar"><b>Procesar BD</b></a> y sube tu CSV de ventas.</div>

    <!-- Menú -->
    <ng-container *ngIf="!vacio() && paso()==='menu'">
      <h2 class="page-title">¡Análisis listo!</h2>
      <p class="page-sub">¿Qué flujo deseas ver?</p>
      <div class="choices">
        <div class="choice" (click)="abrirFinanciero()"><div class="emoji">💵</div><div class="cap">Análisis financiero</div></div>
        <div class="choice" (click)="abrirAdministrativo()"><div class="emoji">📋</div><div class="cap">Análisis administrativo</div></div>
      </div>
      <p *ngIf="cargando()" class="center" style="color:var(--muted);margin-top:18px;">Cargando…</p>
      <p class="msg error">{{ error() }}</p>
    </ng-container>

    <!-- Financiero -->
    <ng-container *ngIf="paso()==='financiero'">
      <h2 class="page-title">Análisis financiero</h2>
      <div class="metrics" *ngIf="fin() as f">
        <div class="metric"><div class="v">S/ {{f.ingreso_total | number:'1.0-0'}}</div><div class="l">Ingreso total</div></div>
        <div class="metric"><div class="v">S/ {{f.costo_total | number:'1.0-0'}}</div><div class="l">Costo total</div></div>
        <div class="metric"><div class="v">S/ {{f.utilidad_bruta | number:'1.0-0'}}</div><div class="l">Utilidad bruta</div></div>
        <div class="metric"><div class="v">{{f.margen_pct}}%</div><div class="l">Margen bruto <app-help texto="Porcentaje de ganancia sobre las ventas: (ingreso - costo) / ingreso. Mientras más alto, mejor rentabilidad."/></div></div>
        <div class="metric"><div class="v">{{f.unidades_vendidas | number}}</div><div class="l">Unidades vendidas</div></div>
      </div>

      <div class="panel"><h3>Ingresos en el tiempo</h3>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
          <label style="font-size:.85rem;color:var(--muted)">Desde</label>
          <input type="date" [(ngModel)]="desde" style="padding:8px;border:1px solid #c9cdcf;border-radius:8px;" />
          <label style="font-size:.85rem;color:var(--muted)">Hasta</label>
          <input type="date" [(ngModel)]="hasta" style="padding:8px;border:1px solid #c9cdcf;border-radius:8px;" />
          <button class="btn" (click)="aplicarFechas()">Filtrar</button>
          <button class="btn-ghost" (click)="limpiarFechas()">Todo</button>
          <span *ngIf="ventasMsg()" style="color:var(--alerta);font-size:.85rem;">{{ ventasMsg() }}</span>
        </div>
        <highcharts-chart [Highcharts]="Highcharts" [options]="optVentas" class="chart" /></div>

      <div class="panel">
        <h3>Detalle financiero por producto</h3>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button class="btn-ghost" (click)="descargarFin('csv')">⬇ CSV</button>
          <button class="btn-ghost" (click)="descargarFin('excel')">⬇ Excel</button>
          <button class="btn-ghost" (click)="descargarFin('pdf')">⬇ PDF</button>
        </div>
        <table>
          <thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>P. venta</th><th>P. compra</th><th>Margen</th><th>Unid. vendidas</th><th>Ganancia</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of detalle()">
              <td>{{r.sku}}</td><td>{{r.nombre}}</td><td>{{r.categoria}}</td>
              <td>S/ {{r.venta | number:'1.2-2'}}</td><td>S/ {{r.compra | number:'1.2-2'}}</td>
              <td>{{r.margen | number:'1.0-0'}}%</td><td>{{r.unidades | number}}</td>
              <td><b>S/ {{r.ganancia | number:'1.0-0'}}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="center">
        <button class="btn" (click)="guardarHistorial('financiero')">💾 Guardar análisis</button>
        <button class="btn-ghost" (click)="paso.set('menu')" style="margin-left:10px;">Regresar</button>
        <span class="msg ok" style="display:inline;margin-left:10px;">{{ guardadoMsg() }}</span>
      </div>
    </ng-container>

    <!-- Administrativo -->
    <ng-container *ngIf="paso()==='administrativo'">
      <h2 class="page-title">Análisis administrativo</h2>
      <div class="metrics" *ngIf="rep() as r">
        <div class="metric"><div class="v">{{r.productos.length}}</div><div class="l">Productos</div></div>
        <div class="metric"><div class="v" style="color:var(--ok)">{{r.n_optimo}}</div><div class="l">Óptimo</div></div>
        <div class="metric"><div class="v" style="color:var(--ambar)">{{r.n_sobre_stock}}</div><div class="l">Sobre stock <app-help texto="Productos con mucho más inventario del necesario. Inmovilizan capital; conviene reducir compras."/></div></div>
        <div class="metric"><div class="v" style="color:var(--alerta)">{{r.n_deficit}}</div><div class="l">Déficit <app-help texto="Productos por debajo del punto de reorden: riesgo de quedarte sin stock. Hay que reponer pronto."/></div></div>
      </div>
      <div class="panel"><h3>Estado del inventario</h3>
        <highcharts-chart [Highcharts]="Highcharts" [options]="optEstados" class="chart" /></div>
      <div class="panel"><h3>Cuellos de botella (productos por agotarse) <app-help texto="Productos que se quedarán sin stock más pronto. Las barras rojas son los déficit: requieren atención inmediata."/></h3>
        <highcharts-chart [Highcharts]="Highcharts" [options]="optCuellos" class="chart" /></div>
      <div class="panel" *ngIf="rep() as r">
        <h3>Recomendaciones por producto</h3>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button class="btn-ghost" (click)="descargarAdmin('csv')">⬇ CSV</button>
          <button class="btn-ghost" (click)="descargarAdmin('excel')">⬇ Excel</button>
          <button class="btn-ghost" (click)="descargarAdmin('pdf')">⬇ PDF</button>
        </div>
        <table><thead><tr><th>SKU</th><th>Producto</th><th>Estado</th><th>Stock</th><th>Demanda/día</th><th>Días a quiebre</th><th>Pedir</th></tr></thead>
          <tbody><tr *ngFor="let p of r.productos">
            <td>{{p.sku}}</td><td>{{p.nombre}}</td>
            <td><span class="pill" [class]="'pill '+clase(p.estado)">{{p.estado}}</span></td>
            <td>{{p.stock_actual}}</td><td>{{p.demanda_diaria_prom}}</td><td>{{p.dias_hasta_quiebre ?? '—'}}</td><td>{{p.cantidad_recomendada_pedir}}</td>
          </tr></tbody></table>
      </div>
      <div class="center">
        <button class="btn" (click)="guardarHistorial('inventario')">💾 Guardar análisis</button>
        <button class="btn-ghost" (click)="paso.set('menu')" style="margin-left:10px;">Regresar</button>
        <span class="msg ok" style="display:inline;margin-left:10px;">{{ guardadoMsg() }}</span>
      </div>
    </ng-container>
  `,
})
export class AnalisisComponent {
  private api = inject(ApiService);
  Highcharts: typeof Highcharts = Highcharts;
  paso = signal<Paso>('menu');
  vacio = signal(false);
  cargando = signal(false);
  error = signal('');
  fin = signal<Finanzas | null>(null);
  rep = signal<Reporte | null>(null);
  detalle = signal<FilaFin[]>([]);
  optVentas: Highcharts.Options = {};
  optEstados: Highcharts.Options = {};
  optCuellos: Highcharts.Options = {};
  desde = ''; hasta = '';
  ventasMsg = signal('');
  guardadoMsg = signal('');

  constructor() {
    this.api.metricas().subscribe((m) => { if (m.sin_datos) this.vacio.set(true); });
  }

  abrirFinanciero() {
    this.cargando.set(true); this.error.set('');
    forkJoin({
      fin: this.api.finanzas(),
      ventas: this.api.ventas(),
      prods: this.api.productos(),
      rank: this.api.ranking(),
    }).subscribe({
      next: ({ fin, ventas, prods, rank }) => {
        this.fin.set(fin);
        this.optVentas = optVentas(ventas.datos || []);
        const u = new Map(rank.ranking.map((r) => [r.sku, r.unidades_vendidas]));
        this.detalle.set(
          prods.map((p) => {
            const venta = +p.salePrice, compra = +p.purchasePrice, unidades = u.get(p.sourceProductId) || 0;
            const margen = venta > 0 ? ((venta - compra) / venta) * 100 : 0;
            return { sku: p.sourceProductId, nombre: p.productName, categoria: p.category,
              venta, compra, unidades, margen, ganancia: unidades * (venta - compra) };
          }).sort((a, b) => b.ganancia - a.ganancia),
        );
        this.cargando.set(false);
        this.paso.set('financiero');
      },
      error: (e) => { this.cargando.set(false); this.error.set(e.error?.message || 'No se pudo cargar el análisis'); },
    });
  }

  abrirAdministrativo() {
    this.cargando.set(true); this.error.set('');
    this.api.reporteInventario().subscribe({
      next: (r) => { this.rep.set(r); this.optEstados = optEstados(r); this.optCuellos = optCuellos(r.productos); this.cargando.set(false); this.paso.set('administrativo'); },
      error: (e) => { this.cargando.set(false); this.error.set(e.error?.message || 'No se pudo cargar el análisis'); },
    });
  }

  aplicarFechas() {
    this.ventasMsg.set('');
    this.api.ventas(this.desde || undefined, this.hasta || undefined).subscribe((v) => {
      if (v.mensaje) this.ventasMsg.set(v.mensaje);
      this.optVentas = optVentas(v.datos || []);
    });
  }
  limpiarFechas() { this.desde = ''; this.hasta = ''; this.aplicarFechas(); }

  // --- Descargas (HU-13 CSV/PDF, HU-16 Excel) ---
  private colsFin: Columna[] = [
    { key: 'sku', label: 'SKU' }, { key: 'nombre', label: 'Producto' }, { key: 'categoria', label: 'Categoria' },
    { key: 'venta', label: 'P. venta' }, { key: 'compra', label: 'P. compra' },
    { key: 'margen', label: 'Margen %' }, { key: 'unidades', label: 'Unidades' }, { key: 'ganancia', label: 'Ganancia' },
  ];
  private colsAdmin: Columna[] = [
    { key: 'sku', label: 'SKU' }, { key: 'nombre', label: 'Producto' }, { key: 'estado', label: 'Estado' },
    { key: 'stock_actual', label: 'Stock' }, { key: 'demanda_diaria_prom', label: 'Demanda/dia' },
    { key: 'dias_hasta_quiebre', label: 'Dias a quiebre' }, { key: 'cantidad_recomendada_pedir', label: 'Pedir' },
  ];

  descargarFin(tipo: 'csv' | 'excel' | 'pdf') {
    const filas = this.detalle().map((r) => ({ ...r, venta: r.venta.toFixed(2), compra: r.compra.toFixed(2), margen: r.margen.toFixed(0), ganancia: r.ganancia.toFixed(2) }));
    if (tipo === 'csv') descargarCsv('reporte_financiero', this.colsFin, filas);
    else if (tipo === 'excel') descargarExcel('reporte_financiero', 'Financiero', this.colsFin, filas);
    else descargarPdf('reporte_financiero', 'Reporte financiero por producto', this.colsFin, filas);
  }

  descargarAdmin(tipo: 'csv' | 'excel' | 'pdf') {
    const filas = this.rep()?.productos ?? [];
    if (tipo === 'csv') descargarCsv('reporte_inventario', this.colsAdmin, filas);
    else if (tipo === 'excel') descargarExcel('reporte_inventario', 'Inventario', this.colsAdmin, filas);
    else descargarPdf('reporte_inventario', 'Reporte de inventario (sobre stock / deficit)', this.colsAdmin, filas);
  }

  // HU-02: guardar foto del análisis actual
  guardarHistorial(tipo: 'financiero' | 'inventario') {
    let dto: any;
    if (tipo === 'financiero') {
      const f = this.fin();
      if (!f) return;
      dto = { tipo, titulo: 'Análisis financiero', resumen: {
        ingreso_total: f.ingreso_total, costo_total: f.costo_total,
        utilidad_bruta: f.utilidad_bruta, margen_pct: f.margen_pct, unidades_vendidas: f.unidades_vendidas } };
    } else {
      const r = this.rep();
      if (!r) return;
      dto = { tipo, titulo: 'Análisis administrativo (inventario)', resumen: {
        n_optimo: r.n_optimo, n_sobre_stock: r.n_sobre_stock, n_deficit: r.n_deficit, productos: r.productos.length } };
    }
    this.api.guardarHistorial(dto).subscribe({
      next: () => { this.guardadoMsg.set('Guardado en el historial ✅'); setTimeout(() => this.guardadoMsg.set(''), 3000); },
      error: () => this.guardadoMsg.set('No se pudo guardar'),
    });
  }

  clase(e: string) { return e === 'SOBRE STOCK' ? 'SOBRE' : e; }
}
