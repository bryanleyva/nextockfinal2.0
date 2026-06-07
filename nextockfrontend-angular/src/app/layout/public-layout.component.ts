import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FooterComponent } from './footer.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FooterComponent],
  template: `
    <div class="app">
      <header class="app-header">
        <a class="brand" routerLink="/"><span class="box">📦</span> NEXTOCK</a>
        <nav class="app-nav">
          <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{exact:true}">inicio</a>
          <a routerLink="/quienes-somos" routerLinkActive="activo">¿Quiénes somos?</a>
          <a routerLink="/prueba-gratuita" routerLinkActive="activo">Prueba gratuita</a>
          <a routerLink="/login" routerLinkActive="activo">LOGIN</a>
        </nav>
      </header>
      <main class="app-main"><div class="container"><router-outlet /></div></main>
      <app-footer />
    </div>
  `,
})
export class PublicLayoutComponent {}
