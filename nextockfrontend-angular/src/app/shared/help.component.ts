import { Component, Input } from '@angular/core';

/**
 * HU-12: icono de ayuda (ℹ️) que muestra una explicación al pasar el cursor.
 * Uso: <app-help texto="El stock de seguridad es..."></app-help>
 */
@Component({
  selector: 'app-help',
  standalone: true,
  styles: [`
    .help { position: relative; display: inline-flex; margin-left: 5px; cursor: help; vertical-align: middle; }
    .ico { width: 17px; height: 17px; border-radius: 50%; background: var(--teal); color: #fff;
      font-size: 11px; font-weight: 700; font-style: normal; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(21,105,95,.3); transition: transform .15s, background .15s; }
    .help:hover .ico { background: var(--teal-light); transform: scale(1.1); }
    .tip { position: absolute; bottom: calc(100% + 10px); left: 50%;
      background: var(--teal-dark); color: #fff; padding: 11px 14px; border-radius: 12px;
      width: max-content; max-width: 250px; white-space: normal; word-break: break-word;
      font-size: .8rem; font-weight: 400; line-height: 1.5; text-align: left; letter-spacing: .1px;
      opacity: 0; visibility: hidden; transform: translateX(-50%) translateY(5px);
      transition: opacity .16s ease, transform .16s ease; z-index: 999;
      box-shadow: 0 12px 30px rgba(14,73,66,.32); pointer-events: none; }
    .tip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 7px solid transparent; border-top-color: var(--teal-dark); }
    .help:hover .tip { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
  `],
  template: `<span class="help"><span class="ico">i</span><span class="tip">{{ texto }}</span></span>`,
})
export class HelpComponent {
  @Input() texto = '';
}
