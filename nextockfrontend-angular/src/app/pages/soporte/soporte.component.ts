import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .form2 { max-width:520px; display:flex; flex-direction:column; gap:12px; }
    .form2 input, .form2 textarea { padding:11px 14px; border:1px solid #d4dbda; border-radius:14px; background:#fff; font-family:inherit; font-size:.95rem; transition:border-color .15s, box-shadow .15s; }
    .form2 input:focus, .form2 textarea:focus { outline:none; border-color:var(--teal-light); box-shadow:0 0 0 3px rgba(47,128,121,.15); }
  `],
  template: `
    <h2 class="page-title">Soporte</h2>
    <p class="page-sub">¿Tienes dudas? Escríbenos o comparte tus reportes con tu equipo</p>

    <!-- Contacto -->
    <div class="panel">
      <h3>Contáctanos</h3>
      <form class="form2" (ngSubmit)="enviar()">
        <input placeholder="Tu nombre" name="n" [(ngModel)]="c.nombre" required />
        <input type="email" placeholder="Tu correo" name="e" [(ngModel)]="c.email" required />
        <textarea placeholder="¿En qué te ayudamos?" rows="4" name="m" [(ngModel)]="c.mensaje" required></textarea>
        <button class="btn" style="align-self:flex-start;" [disabled]="cargando()">Enviar mensaje</button>
      </form>
      <p class="msg" [class.ok]="ok()" [class.error]="!ok()" style="text-align:left">{{ msg() }}</p>
    </div>

    <!-- Compartir reporte por correo -->
    <div class="panel">
      <h3>Compartir reporte por correo</h3>
      <p style="margin-bottom:10px;color:var(--muted)">Envía el reporte de inventario a tu equipo desde el correo oficial.</p>
      <form class="form2" (ngSubmit)="compartir()">
        <input type="email" placeholder="Correo del destinatario" name="d" [(ngModel)]="dest" required />
        <button class="btn" style="align-self:flex-start;" [disabled]="cargando()">Compartir</button>
      </form>
      <p class="msg" [class.ok]="ok2()" [class.error]="!ok2()" style="text-align:left">{{ msg2() }}</p>
    </div>
  `,
})
export class SoporteComponent {
  private api = inject(ApiService);
  cargando = signal(false);
  ok = signal(true); msg = signal('');
  ok2 = signal(true); msg2 = signal('');
  c = { nombre: '', email: '', mensaje: '' };
  dest = '';

  enviar() {
    this.cargando.set(true); this.msg.set('');
    this.api.contacto(this.c).subscribe({
      next: (r) => { this.ok.set(true); this.msg.set(r.mensaje || 'Su mensaje fue enviado'); this.c = { nombre: '', email: '', mensaje: '' }; this.cargando.set(false); },
      error: (e) => { this.ok.set(false); this.msg.set(e.error?.message || 'No se pudo enviar'); this.cargando.set(false); },
    });
  }

  compartir() {
    this.cargando.set(true); this.msg2.set('');
    this.api.compartir({ destinatario: this.dest, reporte: 'inventario' }).subscribe({
      next: (r) => { this.ok2.set(true); this.msg2.set(r.mensaje || 'Reporte compartido'); this.dest = ''; this.cargando.set(false); },
      error: (e) => { this.ok2.set(false); this.msg2.set(e.error?.message || 'No se pudo compartir'); this.cargando.set(false); },
    });
  }
}
