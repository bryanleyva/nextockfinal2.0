import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .barra { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:18px; align-items:center; }
    .barra input, .barra select { padding:11px 14px; border:1px solid var(--borde-fuerte); border-radius:22px; background:#fff; font-family:inherit; font-size:.95rem; color:var(--text); transition:border-color .15s, box-shadow .15s; }
    .barra input:focus, .barra select:focus { outline:none; border-color:var(--teal-light); box-shadow:var(--ring); }
    .barra input { flex:1; min-width:220px; }
    .mov { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
    .mov .input { flex:1; min-width:170px; }
    .mov .cant { max-width:150px; }
  `],
  template: `
    <h2 class="page-title">Inventario</h2>
    <p class="page-sub">Busca, filtra y mantén al día el stock de tu bodega</p>

    <div *ngIf="vacio()" class="aviso">Aún no tienes productos. Ve a <a routerLink="/app/procesar"><b>Procesar BD</b></a>.</div>

    <ng-container *ngIf="!vacio()">
      <!-- Actualización rápida del inventario (movimientos manuales) -->
      <div class="panel">
        <h3>📦 Actualizar inventario</h3>
        <p style="color:var(--muted);margin-bottom:14px;">Registra una <b>venta</b>, un <b>ingreso</b> de mercadería o un <b>ajuste</b> de conteo. El stock y las predicciones se actualizan al instante, sin subir ningún archivo.</p>
        <div class="mov">
          <select class="input" [(ngModel)]="movProd">
            <option [ngValue]="null" disabled>Selecciona un producto…</option>
            <option *ngFor="let p of todos()" [ngValue]="p.productId">{{ p.sourceProductId }} — {{ p.productName }}</option>
          </select>
          <select class="input" [(ngModel)]="movTipo">
            <option value="venta">Venta (sale stock)</option>
            <option value="ingreso">Ingreso (entra stock)</option>
            <option value="ajuste">Ajuste (fijar stock real)</option>
          </select>
          <input class="input cant" type="number" min="0" [(ngModel)]="movCant" placeholder="Cantidad" />
          <button class="btn" (click)="registrar()" [disabled]="movCargando()">Registrar</button>
        </div>
        <p class="msg" [class.ok]="movOk()" [class.error]="!movOk()" style="text-align:left">{{ movMsg() }}</p>
      </div>

      <div class="barra">
        <input placeholder="🔎 Buscar por código o nombre…" [(ngModel)]="q" (keyup.enter)="buscar()" />
        <button class="btn" (click)="buscar()">Buscar</button>
        <select [(ngModel)]="categoria" (change)="filtrar()">
          <option value="Todas">Todas las categorías</option>
          <option *ngFor="let c of categorias()" [value]="c">{{ c }}</option>
        </select>
      </div>

      <p *ngIf="mensaje()" class="msg error">{{ mensaje() }}</p>

      <div class="panel">
        <table>
          <thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>P. venta</th><th>P. compra</th><th>Lead time</th></tr></thead>
          <tbody>
            <tr *ngFor="let p of productos()">
              <td>{{ p.sourceProductId }}</td><td>{{ p.productName }}</td><td>{{ p.category }}</td>
              <td>S/ {{ num(p.salePrice) | number:'1.2-2' }}</td>
              <td>S/ {{ num(p.purchasePrice) | number:'1.2-2' }}</td>
              <td>{{ p.leadTimeDays }} días</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="!productos().length && !mensaje()" class="center" style="color:var(--muted);margin-top:10px;">Sin resultados.</p>
      </div>
    </ng-container>
  `,
})
export class InventarioComponent {
  private api = inject(ApiService);
  productos = signal<any[]>([]);
  todos = signal<any[]>([]);
  categorias = signal<string[]>([]);
  vacio = signal(false);
  mensaje = signal('');
  q = '';
  categoria = 'Todas';

  // Formulario de movimientos
  movProd: number | null = null;
  movTipo: 'venta' | 'ingreso' | 'ajuste' = 'venta';
  movCant: number | null = null;
  movMsg = signal('');
  movOk = signal(true);
  movCargando = signal(false);

  constructor() {
    this.api.categorias().subscribe((c) => this.categorias.set(c || []));
    this.api.productos('Todas').subscribe((p) => this.todos.set(p || []));
    this.cargar();
  }

  registrar() {
    if (this.movProd == null) { this.movOk.set(false); this.movMsg.set('Selecciona un producto.'); return; }
    const cant = Number(this.movCant);
    if (!Number.isFinite(cant) || cant < 0) { this.movOk.set(false); this.movMsg.set('Ingresa una cantidad válida.'); return; }
    this.movCargando.set(true); this.movMsg.set('');
    this.api.registrarMovimiento({ productId: this.movProd, tipo: this.movTipo, cantidad: cant }).subscribe({
      next: (r) => {
        this.movOk.set(true);
        const extra = r.reentrenando ? ' · modelo actualizándose en segundo plano…' : '';
        this.movMsg.set(`✅ ${r.producto.nombre}: stock ${r.stock_anterior} → ${r.stock_actual} unidades.${extra}`);
        this.movCant = null;
        this.movCargando.set(false);
      },
      error: (e) => { this.movOk.set(false); this.movMsg.set(e.error?.message || 'No se pudo registrar el movimiento.'); this.movCargando.set(false); },
    });
  }

  num(v: any) { return +v; }

  cargar() {
    this.api.productos(this.categoria).subscribe((p) => {
      this.productos.set(p);
      if (!p.length && this.categoria === 'Todas') this.vacio.set(true);
    });
  }

  filtrar() { this.mensaje.set(''); this.q = ''; this.cargar(); }

  buscar() {
    this.mensaje.set('');
    if (!this.q.trim()) { this.cargar(); return; }
    this.api.buscar(this.q).subscribe({
      next: (r) => {
        this.productos.set(r.productos);
        if (r.mensaje) this.mensaje.set(r.mensaje);
      },
      error: (e) => this.mensaje.set(e.error?.message || 'Error en la búsqueda'),
    });
  }
}
