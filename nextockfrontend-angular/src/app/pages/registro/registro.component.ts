import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .terms { display:flex; align-items:flex-start; gap:9px; font-size:.86rem; color:var(--text); margin-top:2px; }
    .terms input { margin-top:3px; width:16px; height:16px; accent-color:var(--teal); cursor:pointer; }
    .terms a { color:var(--teal); font-weight:600; cursor:pointer; text-decoration:underline; }
    .overlay { position:fixed; inset:0; background:rgba(14,73,66,.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:18px; }
    .card { background:#fff; border-radius:18px; max-width:640px; width:100%; max-height:90vh; overflow-y:auto; box-shadow:var(--shadow-lg); }
    .card .head { background:linear-gradient(110deg, var(--teal-dark), var(--teal)); color:#fff; padding:18px 24px; border-radius:18px 18px 0 0; position:sticky; top:0; }
    .card .head h3 { font-family:var(--font-head); margin:0; font-size:1.15rem; }
    .card .body { padding:18px 24px; line-height:1.6; font-size:.9rem; color:#33485c; }
    .card .body h4 { color:var(--teal-dark); margin:14px 0 4px; font-size:.95rem; }
    .card .foot { padding:14px 24px 20px; display:flex; justify-content:flex-end; gap:10px; }
  `],
  template: `
    <h2 class="page-title">Prueba gratuita</h2>
    <p class="page-sub">¡COMIENZA A GESTIONAR CON NEXTOCK!</p>

    <form class="form" (ngSubmit)="registrar()">
      <div style="display:flex;gap:12px;">
        <input class="input" style="flex:1" placeholder="Nombres" name="nombres" [(ngModel)]="nombres" maxlength="40" required />
        <input class="input" style="flex:1" placeholder="Apellidos" name="apellidos" [(ngModel)]="apellidos" maxlength="40" required />
      </div>
      <div class="input-phone">
        <span class="pre">+51</span>
        <input class="input" placeholder="Número telefónico (9 dígitos)" name="tel" inputmode="numeric"
               [ngModel]="telefono" (ngModelChange)="telefono = soloDigitos($event, 9)" maxlength="9" />
      </div>
      <input class="input" type="email" placeholder="Correo electrónico" name="email" [(ngModel)]="email" maxlength="80" required />
      <input class="input" placeholder="RUC de tu negocio (11 dígitos)" name="ruc" inputmode="numeric"
             [ngModel]="ruc" (ngModelChange)="ruc = soloDigitos($event, 11)" maxlength="11" />
      <input class="input" type="password" placeholder="Contraseña (mín. 6)" name="pass" [(ngModel)]="password" minlength="6" maxlength="64" required />

      <label class="terms">
        <input type="checkbox" name="acepto" [(ngModel)]="acepto" />
        <span>He leído y acepto los <a (click)="verTerminos.set(true); $event.preventDefault()">términos y condiciones</a> y autorizo voluntariamente el tratamiento de mi información.</span>
      </label>

      <button class="btn btn-lg" [disabled]="cargando()" style="align-self:center;">IR</button>
    </form>
    <p class="msg error">{{ error() }}</p>

    <!-- Términos y Condiciones / Consentimiento informado -->
    <div class="overlay" *ngIf="verTerminos()">
      <div class="card">
        <div class="head"><h3>Términos y Condiciones — Consentimiento Informado</h3></div>
        <div class="body">
          <p>Bienvenido(a) a <b>NEXTOCK</b>, una aplicación web predictiva para la gestión de inventarios de bodegas y pequeños comercios. Antes de registrarte, por favor lee este documento.</p>

          <h4>1. Propósito de la aplicación</h4>
          <p>NEXTOCK utiliza modelos de Machine Learning (XGBoost) para <b>pronosticar la demanda</b> de tus productos, alertar sobre quiebres o sobre stock y apoyar tus decisiones de compra y reposición.</p>

          <h4>2. Información que se recopila</h4>
          <p>Para funcionar, el sistema recopila y almacena: (a) los <b>datos de tu cuenta</b> (nombre, correo, RUC/bodega); y (b) tu <b>información histórica de ventas e inventario</b> (catálogo de productos, unidades vendidas, stock, precios y fechas) que cargas o registras en la plataforma.</p>

          <h4>3. Uso de la información</h4>
          <p>Estos datos se usan <b>únicamente</b> para generar tus reportes, predicciones y métricas dentro de la plataforma, y con fines académicos de validación del sistema. No se comparten con terceros ajenos al estudio.</p>

          <h4>4. Participación voluntaria</h4>
          <p>Tu participación en la prueba de este sistema es <b>completamente voluntaria</b>. Puedes dejar de usar la aplicación en cualquier momento, sin ninguna consecuencia.</p>

          <h4>5. Aceptación</h4>
          <p>Al marcar la casilla y registrarte, declaras que has <b>leído y comprendido</b> este documento y que <b>aceptas voluntariamente</b> participar y que tu información sea tratada según lo aquí descrito.</p>
        </div>
        <div class="foot">
          <button class="btn-ghost" (click)="verTerminos.set(false)">Cerrar</button>
          <button class="btn" (click)="acepto = true; verTerminos.set(false)">Acepto</button>
        </div>
      </div>
    </div>
  `,
})
export class RegistroComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  nombres = ''; apellidos = ''; telefono = ''; email = ''; ruc = ''; password = '';
  acepto = false;
  verTerminos = signal(false);
  cargando = signal(false);
  error = signal('');

  /** Deja solo dígitos y recorta a `max` caracteres. */
  soloDigitos(v: string, max: number): string {
    return (v || '').replace(/\D/g, '').slice(0, max);
  }

  registrar() {
    this.error.set('');
    const nombres = this.nombres.trim();
    const apellidos = this.apellidos.trim();
    const ruc = this.ruc.trim();
    const tel = this.telefono.trim();

    if (!nombres || !apellidos) return this.error.set('Ingresa tus nombres y apellidos.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) return this.error.set('Ingresa un correo electrónico válido.');
    if (ruc && !/^\d{11}$/.test(ruc)) return this.error.set('El RUC debe tener exactamente 11 dígitos.');
    if (tel && !/^\d{9}$/.test(tel)) return this.error.set('El teléfono debe tener 9 dígitos.');
    if (this.password.length < 6) return this.error.set('La contraseña debe tener al menos 6 caracteres.');
    if (!this.acepto) return this.error.set('Debes aceptar los términos y condiciones para registrarte.');

    this.cargando.set(true);
    this.auth.registrar({
      fullName: `${nombres} ${apellidos}`.trim(),
      email: this.email.trim(),
      password: this.password,
      bodega: ruc,
    }).subscribe({
      next: () => this.router.navigate(['/app/inicio']),
      error: (e) => { this.error.set(e.error?.message || 'No se pudo registrar'); this.cargando.set(false); },
    });
  }
}
