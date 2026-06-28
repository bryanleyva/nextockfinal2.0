import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationsComponent } from './notifications.component';
import { EncuestaComponent } from '../shared/encuesta.component';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, NotificationsComponent, EncuestaComponent],
  template: `
    <div class="app">
      <header class="app-header">
        <a class="brand" routerLink="/app/inicio"><span class="box">📦</span> NEXTOCK</a>
        <nav class="app-nav">
          <a routerLink="/app/inicio" routerLinkActive="activo">inicio</a>
          <a *ngIf="auth.esAdmin" routerLink="/app/admin" routerLinkActive="activo">Administración</a>
          <a *ngIf="auth.puedeEditar" routerLink="/app/procesar" routerLinkActive="activo">Procesar BD</a>
          <a *ngIf="auth.puedeEditar" routerLink="/app/inventario" routerLinkActive="activo">Inventario</a>
          <a routerLink="/app/analisis" routerLinkActive="activo">Análisis</a>
          <a routerLink="/app/historial" routerLinkActive="activo">Historial</a>
          <a routerLink="/app/prediccion" routerLinkActive="activo">Predicción</a>
          <a routerLink="/app/soporte" routerLinkActive="activo">Soporte</a>
          <a routerLink="/app/perfil" routerLinkActive="activo">Ver Perfil</a>
          <app-notifications />
          <a (click)="salir()" style="cursor:pointer">Salir</a>
        </nav>
      </header>
      <main class="app-main"><div class="container"><router-outlet /></div></main>
      <app-encuesta />
    </div>
  `,
})
export class PrivateLayoutComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  salir() { this.auth.salir(); this.router.navigate(['/login']); }
}
