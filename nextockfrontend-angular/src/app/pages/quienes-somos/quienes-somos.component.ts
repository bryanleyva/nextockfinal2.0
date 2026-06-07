import { Component } from '@angular/core';

@Component({
  selector: 'app-quienes-somos',
  standalone: true,
  styles: [`
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; max-width: 760px; margin: 10px auto 0; }
    @media (max-width: 620px) { .grid { grid-template-columns: 1fr; } }
    .tile {
      aspect-ratio: 16/10; border-radius: 18px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 18px;
      background: linear-gradient(160deg, var(--panel), var(--teal-soft));
      border: 1px solid var(--borde); box-shadow: var(--shadow);
      transition: transform .16s, box-shadow .16s, border-color .16s;
    }
    .tile:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); border-color: var(--teal-light); }
    .tile .ico {
      font-size: 2.4rem; width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at 35% 30%, var(--mint), var(--teal-soft));
      box-shadow: inset 0 0 0 1px rgba(43, 158, 144, .2);
    }
    .tile .t { font-family: var(--font-head); font-weight: 700; color: var(--teal); font-size: 1.05rem; }
    .tile .d { font-size: .85rem; color: var(--muted); max-width: 240px; }
  `],
  template: `
    <h2 class="page-title">¿Quiénes somos?</h2>
    <p class="page-sub">La aplicación ideal para gestionar tu inventario y ayudarte en la toma de tus decisiones</p>
    <div class="grid">
      <div class="tile"><div class="ico">👥</div><div class="t">Nuestro equipo</div><div class="d">Personas enfocadas en simplificar tu gestión de inventario.</div></div>
      <div class="tile"><div class="ico">🧑‍💻</div><div class="t">Tecnología</div><div class="d">Modelos de Machine Learning (XGBoost) al servicio de tu negocio.</div></div>
      <div class="tile"><div class="ico">🤝</div><div class="t">Compromiso</div><div class="d">Te acompañamos en cada decisión con datos claros y confiables.</div></div>
      <div class="tile"><div class="ico">📊</div><div class="t">Resultados</div><div class="d">Menos quiebres de stock, mejores compras y más control.</div></div>
    </div>
  `,
})
export class QuienesSomosComponent {}
