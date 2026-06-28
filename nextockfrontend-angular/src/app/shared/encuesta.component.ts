import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';

/**
 * Encuesta de Experiencia de Usuario (validación de la tesis).
 * Aparece como modal cuando el backend indica que toca (5° día tras registrarse).
 */
@Component({
  selector: 'app-encuesta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(14,73,66,.45); display: flex;
      align-items: center; justify-content: center; z-index: 1000; padding: 18px; }
    .card { background: #fff; border-radius: 18px; max-width: 620px; width: 100%; max-height: 92vh;
      overflow-y: auto; box-shadow: var(--shadow-lg); }
    .head { background: linear-gradient(110deg, var(--teal-dark), var(--teal)); color: #fff;
      padding: 20px 24px; border-radius: 18px 18px 0 0; position: sticky; top: 0; }
    .head h3 { font-family: var(--font-head); font-size: 1.2rem; margin: 0; }
    .head p { font-size: .82rem; opacity: .9; margin-top: 6px; }
    .body { padding: 8px 24px 20px; }
    .q { padding: 16px 0; border-bottom: 1px solid var(--borde); }
    .qtext { font-weight: 600; color: var(--text); font-size: .95rem; margin-bottom: 12px; }
    .likert { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .anchor { font-size: .76rem; color: var(--muted); flex: 1; min-width: 90px; }
    .anchor.r { text-align: right; }
    .opt { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; }
    .opt input { display: none; }
    .dot { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--borde-fuerte);
      display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700;
      color: var(--muted); transition: all .12s; }
    .opt input:checked + .dot { background: var(--teal); border-color: var(--teal); color: #fff; transform: scale(1.1); }
    .opt:hover .dot { border-color: var(--teal-light); }
    .foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 24px 22px; flex-wrap: wrap; }
    .later { color: var(--muted); cursor: pointer; font-size: .88rem; }
    .later:hover { color: var(--teal); }
  `],
  template: `
    <div class="overlay" *ngIf="mostrar()">
      <div class="card">
        <div class="head">
          <h3>Evaluación de Experiencia de Usuario — Modelo Predictivo</h3>
          <p>Califica tu experiencia del 1 (Muy en desacuerdo / Difícil) al 5 (Muy de acuerdo / Fácil).</p>
        </div>
        <div class="body">
          <div class="q" *ngFor="let q of preguntas; let i = index">
            <p class="qtext">{{ i + 1 }}. {{ q.texto }}</p>
            <div class="likert">
              <span class="anchor">{{ q.izq }}</span>
              <label class="opt" *ngFor="let n of escala">
                <input type="radio" [name]="'q' + i" [value]="n" [(ngModel)]="r[i]" />
                <span class="dot">{{ n }}</span>
              </label>
              <span class="anchor r">{{ q.der }}</span>
            </div>
          </div>
          <p class="msg" [class.ok]="ok()" [class.error]="!ok()" style="text-align:left">{{ msg() }}</p>
        </div>
        <div class="foot">
          <span class="later" (click)="luego()">Responder luego</span>
          <button class="btn" (click)="enviar()" [disabled]="enviando()">Enviar respuestas</button>
        </div>
      </div>
    </div>
  `,
})
export class EncuestaComponent {
  private api = inject(ApiService);
  mostrar = signal(false);
  enviando = signal(false);
  ok = signal(true);
  msg = signal('');
  escala = [1, 2, 3, 4, 5];
  r: (number | null)[] = [null, null, null, null, null];

  preguntas = [
    { texto: '¿Fue sencillo registrarse, iniciar sesión y cargar el archivo Excel/CSV al sistema?', izq: 'Muy difícil', der: 'Muy sencillo' },
    { texto: '¿Los gráficos predictivos y los tooltips de ayuda técnica fueron fáciles de comprender?', izq: 'Muy difícil de comprender', der: 'Muy fácil de comprender' },
    { texto: '¿La plataforma respondió de forma rápida (menos de 10 segundos) al procesar la información con el modelo XGBoost?', izq: 'Respuesta muy lenta', der: 'Respuesta muy rápida' },
    { texto: '¿Las recomendaciones del algoritmo (alertas de sobre stock o demanda proyectada) resultaron útiles para la toma de decisiones del negocio?', izq: 'Nada útiles', der: 'Muy útiles' },
    { texto: '¿Estás satisfecho con la experiencia del modelo de predicción?', izq: 'Muy insatisfecho', der: 'Muy satisfecho' },
  ];

  constructor() {
    this.api.encuestaPendiente().subscribe({
      next: (e) => { if (e?.mostrar) this.mostrar.set(true); },
      error: () => {},
    });
  }

  luego() { this.mostrar.set(false); }

  enviar() {
    if (this.r.some((v) => v == null)) {
      this.ok.set(false); this.msg.set('Por favor responde todas las preguntas.'); return;
    }
    this.enviando.set(true); this.msg.set('');
    this.api.enviarEncuesta({
      p1: this.r[0]!, p2: this.r[1]!, p3: this.r[2]!, p4: this.r[3]!, p5: this.r[4]!,
    }).subscribe({
      next: () => {
        this.ok.set(true); this.msg.set('¡Gracias por tu respuesta!');
        setTimeout(() => this.mostrar.set(false), 1200);
      },
      error: (e) => { this.ok.set(false); this.msg.set(e.error?.message || 'No se pudo enviar.'); this.enviando.set(false); },
    });
  }
}
