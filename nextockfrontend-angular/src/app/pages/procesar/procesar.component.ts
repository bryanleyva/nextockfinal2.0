import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-procesar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    .wrap { max-width: 760px; margin: 0 auto; }
    .pasos { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
    @media (max-width: 720px) { .pasos { grid-template-columns: 1fr; } }
    .card { background: var(--panel); border: 1px solid var(--borde); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow); display: flex; flex-direction: column; }
    .head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .num { width: 36px; height: 36px; border-radius: 50%; background: var(--teal-soft); color: var(--teal); display: flex; align-items: center; justify-content: center; font-weight: 800; flex: none; }
    .head .t { font-weight: 700; color: var(--text); }
    .head .s { font-size: .8rem; color: var(--muted); }
    .card .btn { margin-top: 16px; align-self: stretch; }
    .ayuda { display: flex; align-items: center; gap: 10px; justify-content: center; margin-top: 22px; color: var(--muted); font-size: .9rem; background: var(--teal-soft); border-radius: var(--radius-sm); padding: 12px 18px; }
  `],
  template: `
    <div class="wrap">
      <h2 class="page-title">Procesar base de datos</h2>
      <p class="page-sub">Sube tu información y deja que NEXTOCK la analice por ti</p>

      <div *ngIf="!cargando(); else loading">
        <div class="pasos">
          <!-- Paso 1: productos -->
          <div class="card">
            <div class="head">
              <span class="num">1</span>
              <div><div class="t">Catálogo de productos</div><div class="s">Archivo de tus productos</div></div>
            </div>
            <label class="uploader" [class.tiene]="nomProd()">
              <input type="file" accept=".csv,.xlsx,.xls" (change)="setProd($event)" />
              <span class="up-ico">{{ nomProd() ? '✅' : '📦' }}</span>
              <span class="up-main">{{ nomProd() ? 'Archivo listo' : 'Selecciona o arrastra tu archivo' }}</span>
              <span class="up-hint">Formatos: CSV, Excel (.xlsx, .xls)</span>
              <span class="up-file" *ngIf="nomProd()">{{ nomProd() }}</span>
            </label>
            <button class="btn" (click)="subirProd()">Subir productos</button>
          </div>

          <!-- Paso 2: ventas -->
          <div class="card">
            <div class="head">
              <span class="num">2</span>
              <div><div class="t">Ventas e inventario</div><div class="s">Tu base de datos de movimientos</div></div>
            </div>
            <label class="uploader" [class.tiene]="nomHechos()">
              <input type="file" accept=".csv,.xlsx,.xls" (change)="setHechos($event)" />
              <span class="up-ico">{{ nomHechos() ? '✅' : '📊' }}</span>
              <span class="up-main">{{ nomHechos() ? 'Archivo listo' : 'Selecciona o arrastra tu archivo' }}</span>
              <span class="up-hint">Formatos: CSV, Excel (.xlsx, .xls)</span>
              <span class="up-file" *ngIf="nomHechos()">{{ nomHechos() }}</span>
            </label>
            <button class="btn" (click)="subirHechos()">Adjuntar base de datos</button>
          </div>
        </div>

        <div class="ayuda">
          <span style="font-size:1.3rem;">💡</span>
          <span>Sube primero los <b>productos</b> y luego las <b>ventas</b>. El modelo de predicción se entrena automáticamente.</span>
        </div>

        <p class="msg" [class.ok]="ok()" [class.error]="!ok()">{{ msg() }}</p>
        <div *ngIf="listo()" class="center" style="margin-top:16px;">
          <a class="btn" routerLink="/app/analisis">Ir a Análisis</a>
          <a class="btn-ghost" routerLink="/app/prediccion" style="margin-left:10px;">Ir a Predicción</a>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <h3 class="page-title" style="font-size:1.8rem;">Analizando la base de datos</h3>
      <div class="loading-bar"></div>
      <p class="center" style="color:var(--muted)">Entrenando el modelo XGBoost con tus datos…</p>
    </ng-template>
  `,
})
export class ProcesarComponent {
  private api = inject(ApiService);
  cargando = signal(false);
  listo = signal(false);
  msg = signal('');
  ok = signal(true);
  nomProd = signal('');
  nomHechos = signal('');
  private fileProd?: File;
  private fileHechos?: File;

  setProd(e: Event) { this.fileProd = (e.target as HTMLInputElement).files?.[0]; this.nomProd.set(this.fileProd?.name || ''); }
  setHechos(e: Event) { this.fileHechos = (e.target as HTMLInputElement).files?.[0]; this.nomHechos.set(this.fileHechos?.name || ''); }

  subirProd() {
    if (!this.fileProd) return this.aviso('Selecciona el archivo de productos', false);
    this.api.subirProductos(this.fileProd).subscribe({
      next: (r) => this.aviso(`Cargadas ${r.filas} filas de productos.`, true),
      error: (e) => this.aviso(e.error?.message || 'Error al subir', false),
    });
  }

  subirHechos() {
    if (!this.fileHechos) return this.aviso('Selecciona el archivo de ventas', false);
    this.cargando.set(true);
    this.api.subirHechos(this.fileHechos).subscribe({
      next: (r) => {
        this.cargando.set(false);
        let t = `Cargadas ${r.filas} filas. `;
        if (r.entrenamiento?.mae !== undefined) t += `Modelo reentrenado (MAE ${r.entrenamiento.mae}).`;
        this.aviso(t, true); this.listo.set(true);
      },
      error: (e) => { this.cargando.set(false); this.aviso(e.error?.message || 'Error al subir', false); },
    });
  }

  private aviso(t: string, ok: boolean) { this.msg.set(t); this.ok.set(ok); }
}
