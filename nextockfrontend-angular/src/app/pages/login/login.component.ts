import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="panel form center" style="max-width:440px;margin:30px auto;">
      <div class="avatar">👤</div>
      <form (ngSubmit)="entrar()" class="form">
        <div class="field"><label>USUARIO (correo):</label>
          <input class="input" type="email" name="email" [(ngModel)]="email" required /></div>
        <div class="field"><label>CONTRASEÑA:</label>
          <input class="input" type="password" name="pass" [(ngModel)]="password" required /></div>
        <a class="link" routerLink="/prueba-gratuita">¿No tienes cuenta? Regístrate</a>
        <button class="btn btn-lg" [disabled]="cargando()" style="align-self:center;margin-top:8px;">ENTRAR</button>
      </form>
      <p class="msg error">{{ error() }}</p>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = '';
  password = '';
  cargando = signal(false);
  error = signal('');

  entrar() {
    this.cargando.set(true); this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/app/inicio']),
      error: (e) => { this.error.set(e.error?.message || 'Usuario o contraseña incorrectos'); this.cargando.set(false); },
    });
  }
}
