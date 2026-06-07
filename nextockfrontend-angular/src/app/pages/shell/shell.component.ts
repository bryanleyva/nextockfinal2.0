import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  styles: [`
    .topbar { display: flex; align-items: center; justify-content: space-between; background: #fff;
      padding: 12px 24px; border-bottom: 1px solid var(--borde); position: sticky; top: 0; z-index: 10; }
    .logo { font-size: 1.3rem; }
    nav { display: flex; gap: 6px; }
    a.nav-btn { text-decoration: none; padding: 8px 16px; border-radius: 8px; color: #6b7280; font-size: .95rem; }
    a.nav-btn.activo { background: var(--rojo); color: #fff; }
    .user-box { display: flex; align-items: center; gap: 12px; font-size: .9rem; }
    .content { max-width: 1200px; margin: 0 auto; padding: 24px; }
  `],
  template: `
    <header class="topbar">
      <h1 class="logo">NE<span>X</span>TOCK</h1>
      <nav>
        <a class="nav-btn" routerLink="/app/dashboard" routerLinkActive="activo">Dashboard</a>
        <a class="nav-btn" routerLink="/app/prediccion" routerLinkActive="activo">Predicción</a>
        <a class="nav-btn" routerLink="/app/reportes" routerLinkActive="activo">Reportes</a>
        <a class="nav-btn" routerLink="/app/subir" routerLinkActive="activo">Subir datos</a>
      </nav>
      <div class="user-box">
        <span>👤 {{ auth.usuario()?.nombre }}</span>
        <button class="btn-ghost" (click)="salir()">Salir</button>
      </div>
    </header>
    <main class="content"><router-outlet /></main>
  `,
})
export class ShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  salir() { this.auth.salir(); this.router.navigate(['/login']); }
}
