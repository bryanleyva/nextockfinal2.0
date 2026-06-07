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
        <input class="input" style="flex:1" placeholder="Nombres" name="nombres" [(ngModel)]="nombres" required />
        <input class="input" style="flex:1" placeholder="Apellidos" name="apellidos" [(ngModel)]="apellidos" required />
      </div>
      <div class="input-phone">
        <span class="pre">+51</span>
        <input class="input" placeholder="Número telefónico" name="tel" [(ngModel)]="telefono" />
      </div>
      <input class="input" type="email" placeholder="Correo electrónico" name="email" [(ngModel)]="email" required />
      <input class="input" placeholder="RUC de tu negocio" name="ruc" [(ngModel)]="ruc" />
      <input class="input" type="password" placeholder="Contraseña (mín. 6)" name="pass" [(ngModel)]="password" required />
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

  registrar() {
    this.cargando.set(true); this.error.set('');
    this.auth.registrar({
      fullName: `${this.nombres} ${this.apellidos}`.trim(),
      email: this.email,
      password: this.password,
      bodega: this.ruc,
    }).subscribe({
      next: () => this.router.navigate(['/app/inicio']),
      error: (e) => { this.error.set(e.error?.message || 'No se pudo registrar'); this.cargando.set(false); },
    });
  }
}
