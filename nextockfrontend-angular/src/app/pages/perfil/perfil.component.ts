import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { assetUrl } from '../../core/config';
import { Perfil } from '../../core/models';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .wrap { display:flex; gap:40px; align-items:flex-start; justify-content:center; flex-wrap:wrap; margin-top:10px; }
    .datos { display:flex; flex-direction:column; gap:12px; max-width:360px; width:100%; }
    .dato { background:#c7ccce; border-radius:22px; padding:11px 16px; }
    .ava-col { text-align:center; }
    .ava { width:170px; height:170px; border-radius:50%; background:#cfd3d4; object-fit:cover;
      display:flex; align-items:center; justify-content:center; font-size:4rem; color:#fff; margin:0 auto; overflow:hidden; }
    .ava img { width:100%; height:100%; object-fit:cover; }
    .field label { font-size:.8rem; color:var(--muted); font-weight:600; }
  `],
  template: `
    <h2 class="page-title">Tu Perfil</h2>
    <p class="page-sub">Visualiza y edita tu información privada aquí</p>

    <div class="wrap" *ngIf="p() as u">
      <!-- Columna izquierda: datos -->
      <div class="datos">
        <ng-container *ngIf="!editando()">
          <div class="dato"><b>Nombre:</b> {{ u.nombre }}</div>
          <div class="dato"><b>Correo:</b> {{ u.email }}</div>
          <div class="dato"><b>Teléfono:</b> {{ u.telefono || '—' }}</div>
          <div class="dato"><b>Bodega / RUC:</b> {{ u.bodega || '—' }}</div>
          <div class="dato"><b>Rol:</b> {{ u.rol }}</div>
          <button class="btn" style="align-self:center;margin-top:6px;" (click)="editar()">Editar</button>
        </ng-container>

        <ng-container *ngIf="editando()">
          <div class="field"><label>Nombre</label><input class="input" name="n" [(ngModel)]="form.fullName" /></div>
          <div class="field"><label>Teléfono</label><input class="input" name="t" [(ngModel)]="form.phone" /></div>
          <div class="field"><label>Bodega / RUC</label><input class="input" name="b" [(ngModel)]="form.bodega" /></div>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:6px;">
            <button class="btn" (click)="guardar()" [disabled]="cargando()">Guardar</button>
            <button class="btn-ghost" (click)="cancelar()">Cancelar</button>
          </div>
        </ng-container>
        <p class="msg" [class.ok]="ok()" [class.error]="!ok()">{{ msg() }}</p>
      </div>

      <!-- Columna derecha: avatar -->
      <div class="ava-col">
        <div class="ava">
          <img *ngIf="fotoPreview() || u.foto" [src]="fotoPreview() || foto(u.foto)" alt="avatar" />
          <span *ngIf="!fotoPreview() && !u.foto">👤</span>
        </div>
        <div *ngIf="editando()" style="margin-top:12px;">
          <input type="file" accept="image/*" (change)="elegirFoto($event)" />
        </div>
      </div>
    </div>

    <div class="panel" style="max-width:440px;margin:24px auto 0;">
      <h3>Seguridad</h3>
      <button *ngIf="!cambiarPass()" class="btn-ghost" (click)="cambiarPass.set(true)">Cambiar contraseña</button>
      <div *ngIf="cambiarPass()" class="datos">
        <div class="field"><label>Contraseña actual</label><input class="input" type="password" name="pa" [(ngModel)]="pass.actual" /></div>
        <div class="field"><label>Nueva contraseña (mín. 6)</label><input class="input" type="password" name="pn" [(ngModel)]="pass.nueva" /></div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn" (click)="guardarPass()" [disabled]="cargando()">Guardar contraseña</button>
          <button class="btn-ghost" (click)="cambiarPass.set(false)">Cancelar</button>
        </div>
        <p class="msg" [class.ok]="okPass()" [class.error]="!okPass()" style="text-align:left">{{ msgPass() }}</p>
      </div>
    </div>
  `,
})
export class PerfilComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  cambiarPass = signal(false);
  okPass = signal(true);
  msgPass = signal('');
  pass = { actual: '', nueva: '' };
  p = signal<Perfil | null>(null);
  editando = signal(false);
  cargando = signal(false);
  ok = signal(true);
  msg = signal('');
  fotoPreview = signal<string | null>(null);
  private archivo?: File;
  form: { fullName: string; phone: string; bodega: string } = { fullName: '', phone: '', bodega: '' };

  constructor() { this.cargar(); }

  cargar() { this.api.perfil().subscribe((u) => this.p.set(u)); }
  foto(ruta: string | null) { return assetUrl(ruta); }

  editar() {
    const u = this.p()!;
    this.form = { fullName: u.nombre, phone: u.telefono || '', bodega: u.bodega || '' };
    this.fotoPreview.set(null); this.archivo = undefined; this.msg.set('');
    this.editando.set(true);
  }
  cancelar() { this.editando.set(false); this.fotoPreview.set(null); this.archivo = undefined; }

  elegirFoto(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.archivo = f;
    const reader = new FileReader();
    reader.onload = () => this.fotoPreview.set(reader.result as string);
    reader.readAsDataURL(f);
  }

  guardar() {
    this.cargando.set(true); this.msg.set('');
    this.api.actualizarPerfil(this.form).subscribe({
      next: (u) => {
        if (this.archivo) {
          this.api.subirAvatar(this.archivo).subscribe({
            next: (u2) => this.finOk(u2),
            error: (e) => this.finErr(e),
          });
        } else { this.finOk(u); }
      },
      error: (e) => this.finErr(e),
    });
  }

  private finOk(u: Perfil) {
    this.p.set(u); this.cargando.set(false); this.editando.set(false);
    this.fotoPreview.set(null); this.archivo = undefined;
    this.ok.set(true); this.msg.set('Perfil actualizado ✅');
  }
  private finErr(e: any) {
    this.cargando.set(false); this.ok.set(false);
    this.msg.set(e.error?.message || 'No se pudo guardar');
  }

  guardarPass() {
    this.cargando.set(true); this.msgPass.set('');
    this.auth.cambiarPassword(this.pass.actual, this.pass.nueva).subscribe({
      next: (r: any) => { this.okPass.set(true); this.msgPass.set(r.mensaje || 'Contraseña actualizada'); this.pass = { actual: '', nueva: '' }; this.cargando.set(false); this.cambiarPass.set(false); },
      error: (e) => { this.okPass.set(false); this.msgPass.set(e.error?.message || 'No se pudo cambiar'); this.cargando.set(false); },
    });
  }
}
