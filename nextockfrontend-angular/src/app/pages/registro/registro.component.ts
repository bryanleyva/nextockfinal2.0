import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
      <button class="btn btn-lg" [disabled]="cargando()" style="align-self:center;">IR</button>
    </form>
    <p class="msg error">{{ error() }}</p>
  `,
})
export class RegistroComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  nombres = ''; apellidos = ''; telefono = ''; email = ''; ruc = ''; password = '';
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
