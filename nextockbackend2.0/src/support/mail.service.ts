import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Envío de correos (HU-07, HU-20) vía Gmail.
 * Si MAIL_USER/MAIL_PASS no están configurados, funciona en modo SIMULADO
 * (no envía pero responde OK) para no romper la app en desarrollo.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  readonly from: string;
  readonly habilitado: boolean;

  constructor(config: ConfigService) {
    const user = config.get<string>('MAIL_USER');
    const pass = config.get<string>('MAIL_PASS');
    this.from = config.get<string>('MAIL_FROM', 'nextockreportes@gmail.com');
    this.habilitado = !!(user && pass);
    if (this.habilitado) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }
  }

  async enviar(opts: {
    to: string;
    subject: string;
    text: string;
    attachments?: { filename: string; path: string }[];
  }): Promise<{ enviado: boolean; simulado: boolean }> {
    if (!this.habilitado || !this.transporter) {
      this.logger.warn(`[SIMULADO] correo a ${opts.to}: ${opts.subject}`);
      return { enviado: true, simulado: true };
    }
    await this.transporter.sendMail({ from: this.from, ...opts });
    return { enviado: true, simulado: false };
  }
}
