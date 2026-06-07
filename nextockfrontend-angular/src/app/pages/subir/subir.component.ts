import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-subir',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .drop { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; padding: 14px;
      border: 1px dashed var(--borde); border-radius: 8px; }
    label { font-weight: 600; font-size: .9rem; }
  `],
  template: `
    <h2>Subir base de datos (CSV)</h2>
    <div class="panel">
      <p>Sube los archivos CSV de <b>tu</b> bodega. Al subir las ventas, el modelo XGBoost se reentrena solo con tus datos.</p>

      <div class="drop">
        <label>1) Catálogo de productos (product.csv)</label>
        <input type="file" accept=".csv" (change)="setProd($event)" />
        <button class="btn-secondary" (click)="subirProd()" [disabled]="cargando()">Subir productos</button>
      </div>

      <div class="drop">
        <label>2) Ventas e inventario (fact_sales_inventory.csv)</label>
        <input type="file" accept=".csv" (change)="setHechos($event)" />
        <button class="btn-secondary" (click)="subirHechos()" [disabled]="cargando()">Subir y reentrenar</button>
      </div>

      <p class="msg" [class.ok]="ok()" [class.error]="!ok()">{{ msg() }}</p>
    </div>
  `,
})
export class SubirComponent {
  private api = inject(ApiService);
  cargando = signal(false);
  msg = signal('');
  ok = signal(true);
  private fileProd?: File;
  private fileHechos?: File;

  setProd(e: Event) { this.fileProd = (e.target as HTMLInputElement).files?.[0]; }
  setHechos(e: Event) { this.fileHechos = (e.target as HTMLInputElement).files?.[0]; }

  subirProd() {
    if (!this.fileProd) return this.aviso('Selecciona el archivo de productos', false);
    this.cargando.set(true);
    this.api.subirProductos(this.fileProd).subscribe({
      next: (r) => { this.aviso(`Cargadas ${r.filas} filas en ${r.tabla}.`, true); this.cargando.set(false); },
      error: (e) => { this.aviso(e.error?.message || 'Error al subir', false); this.cargando.set(false); },
    });
  }

  subirHechos() {
    if (!this.fileHechos) return this.aviso('Selecciona el archivo de ventas', false);
    this.cargando.set(true);
    this.api.subirHechos(this.fileHechos).subscribe({
      next: (r) => {
        let t = `Cargadas ${r.filas} filas. `;
        if (r.entrenamiento?.mae !== undefined) t += `Modelo reentrenado (MAE ${r.entrenamiento.mae}).`;
        this.aviso(t, true); this.cargando.set(false);
      },
      error: (e) => { this.aviso(e.error?.message || 'Error al subir', false); this.cargando.set(false); },
    });
  }

  private aviso(texto: string, ok: boolean) { this.msg.set(texto); this.ok.set(ok); }
}
