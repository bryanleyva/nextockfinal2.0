import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { dinero, numero, porcentaje } from '../../core/formato';

interface ItemHist {
  id: number; tipo: 'financiero' | 'inventario'; titulo: string;
  resumen: any; createdAt: string;
}
type FmtTipo = 'money' | 'pct' | 'int';
interface MetricaComp { label: string; valores: (number | string)[]; fmt: FmtTipo; }

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    .tag { padding:3px 10px; border-radius:12px; font-size:.75rem; font-weight:700; color:#fff; }
    .tag.financiero { background:var(--teal); } .tag.inventario { background:var(--ambar); }
    .resumen { font-size:.85rem; color:var(--muted); }
    .barra { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
    .sel { width:18px; height:18px; accent-color:var(--teal); cursor:pointer; }
    .comp-head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
    .comp-table th, .comp-table td { text-align:center; }
    .comp-table th:first-child, .comp-table td:first-child { text-align:left; font-weight:600; color:var(--text); background:#fff; }
    .delta { font-size:.78rem; font-weight:700; margin-left:6px; }
    .up { color:var(--ok); } .down { color:var(--alerta); } .eq { color:var(--muted); }
    .colfecha { font-size:.78rem; color:var(--muted); font-weight:500; }
  `],
  template: `
    <h2 class="page-title">Historial de análisis</h2>
    <p class="page-sub">Guarda tus análisis y compáralos a lo largo del tiempo</p>

    <div *ngIf="vacio()" class="aviso">
      No hay análisis registrados. Genera uno en <a routerLink="/app/analisis"><b>Análisis</b></a> y pulsa "Guardar análisis".
    </div>

    <!-- Panel de comparación -->
    <div class="panel" *ngIf="comparacion() as c">
      <div class="comp-head">
        <h3 style="margin:0;">Comparación de análisis ({{ c.cols.length }})</h3>
        <button class="btn-ghost" (click)="cerrarComparacion()">Cerrar comparación</button>
      </div>
      <p class="resumen" style="margin:6px 0 14px;">
        La columna ▲/▼ muestra el cambio respecto al análisis más antiguo seleccionado.
      </p>
      <table class="comp-table">
        <thead>
          <tr>
            <th>Métrica</th>
            <th *ngFor="let col of c.cols">
              {{ col.titulo }}<br><span class="colfecha">{{ col.fecha | date:'dd/MM/yy HH:mm' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of c.metricas">
            <td>{{ m.label }}</td>
            <td *ngFor="let v of m.valores; let i = index">
              {{ fmtVal(v, m.fmt) }}
              <span *ngIf="i > 0" class="delta" [class]="dir(m.valores[0], v)">{{ deltaTxt(m.valores[0], v, m.fmt) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Lista -->
    <div class="panel" *ngIf="!vacio()">
      <div class="barra">
        <span class="resumen">Selecciona 2 o más análisis del <b>mismo tipo</b> para compararlos.</span>
        <span style="flex:1"></span>
        <button class="btn" [disabled]="!puedeComparar()" (click)="comparar()">Comparar seleccionados ({{ seleccion().size }})</button>
      </div>
      <p *ngIf="aviso()" class="msg error" style="text-align:left;margin-top:0;">{{ aviso() }}</p>
      <table>
        <thead><tr><th style="width:40px;"></th><th>Fecha</th><th>Tipo</th><th>Análisis</th><th>Resumen</th></tr></thead>
        <tbody>
          <tr *ngFor="let h of items()">
            <td><input class="sel" type="checkbox" [checked]="seleccion().has(h.id)" (change)="toggle(h.id)" /></td>
            <td>{{ h.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
            <td><span class="tag" [class]="'tag '+h.tipo">{{ h.tipo }}</span></td>
            <td>{{ h.titulo }}</td>
            <td class="resumen">{{ resumenTexto(h) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class HistorialComponent {
  private api = inject(ApiService);
  items = signal<ItemHist[]>([]);
  vacio = signal(false);
  seleccion = signal<Set<number>>(new Set());
  aviso = signal('');
  comparacion = signal<{ cols: { titulo: string; fecha: string }[]; metricas: MetricaComp[] } | null>(null);

  // Habilita el botón sólo si hay ≥2 seleccionados y todos del mismo tipo
  puedeComparar = computed(() => {
    const ids = this.seleccion();
    if (ids.size < 2) return false;
    const tipos = new Set(this.items().filter((i) => ids.has(i.id)).map((i) => i.tipo));
    return tipos.size === 1;
  });

  constructor() {
    this.api.historial().subscribe((r) => {
      this.items.set(r.items || []);
      if (!r.items?.length) this.vacio.set(true);
    });
  }

  toggle(id: number) {
    const s = new Set(this.seleccion());
    s.has(id) ? s.delete(id) : s.add(id);
    this.seleccion.set(s);
    this.aviso.set('');
  }

  comparar() {
    const ids = this.seleccion();
    const sel = this.items()
      .filter((i) => ids.has(i.id))
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)); // antiguo → reciente
    if (sel.length < 2) return;
    if (new Set(sel.map((s) => s.tipo)).size > 1) {
      this.aviso.set('Selecciona análisis del mismo tipo para compararlos.');
      return;
    }

    const tipo = sel[0].tipo;
    const cols = sel.map((s) => ({ titulo: s.titulo, fecha: s.createdAt }));
    const campos: { label: string; key: string; fmt: FmtTipo }[] = tipo === 'financiero'
      ? [
          { label: 'Ingreso total (S/)', key: 'ingreso_total', fmt: 'money' },
          { label: 'Costo total (S/)', key: 'costo_total', fmt: 'money' },
          { label: 'Utilidad bruta (S/)', key: 'utilidad_bruta', fmt: 'money' },
          { label: 'Margen bruto (%)', key: 'margen_pct', fmt: 'pct' },
          { label: 'Unidades vendidas', key: 'unidades_vendidas', fmt: 'int' },
        ]
      : [
          { label: 'Productos', key: 'productos', fmt: 'int' },
          { label: 'Óptimo', key: 'n_optimo', fmt: 'int' },
          { label: 'Sobre stock', key: 'n_sobre_stock', fmt: 'int' },
          { label: 'Déficit', key: 'n_deficit', fmt: 'int' },
        ];

    const metricas: MetricaComp[] = campos.map((c) => ({
      label: c.label,
      fmt: c.fmt,
      valores: sel.map((s) => {
        const v = s.resumen?.[c.key];
        return v ?? '—';
      }),
    }));
    this.comparacion.set({ cols, metricas });
  }

  cerrarComparacion() { this.comparacion.set(null); }

  dir(base: number | string, v: number | string): string {
    const a = Number(base), b = Number(v);
    if (!isFinite(a) || !isFinite(b) || a === b) return 'eq';
    return b > a ? 'up' : 'down';
  }
  /** Formatea un valor de la tabla de comparación según su tipo. */
  fmtVal(v: number | string, fmt: FmtTipo): string {
    if (v === '—' || v == null) return '—';
    if (fmt === 'money') return dinero(v);
    if (fmt === 'pct') return porcentaje(v);
    return numero(v);
  }

  deltaTxt(base: number | string, v: number | string, fmt: FmtTipo = 'int'): string {
    const a = Number(base), b = Number(v);
    if (!isFinite(a) || !isFinite(b)) return '';
    const d = b - a;
    if (d === 0) return '=';
    const signo = d > 0 ? '▲' : '▼';
    return `${signo} ${numero(Math.abs(d), fmt === 'int' ? 0 : 2)}`;
  }

  resumenTexto(h: ItemHist): string {
    const r = h.resumen || {};
    if (h.tipo === 'financiero') {
      return `Ingreso ${dinero(r.ingreso_total)} · Utilidad ${dinero(r.utilidad_bruta)} · Margen ${porcentaje(r.margen_pct)}`;
    }
    return `Óptimo ${r.n_optimo ?? '-'} · Sobre stock ${r.n_sobre_stock ?? '-'} · Déficit ${r.n_deficit ?? '-'}`;
  }
}
