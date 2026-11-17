// src/lib/email-adapter.ts
// Adaptador desacoplado de correo (ADR-007).
// Interfaz EmailAdapter + implementación Resend (producción) y stub en memoria (tests/desarrollo).

import { Resend } from "resend";

export interface EmailAdapter {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void>;
}

// Dirección remitente por defecto (no es un secreto).
const DEFAULT_FROM = "onboarding@resend.dev";

export class ResendEmailAdapter implements EmailAdapter {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(apiKey?: string, from = DEFAULT_FROM) {
    this.resend = new Resend(apiKey);
    this.from = from;
  }

  async sendEmail({ to, subject, html, text }: Parameters<EmailAdapter["sendEmail"]>[0]): Promise<void> {
    await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
      text,
    });
  }
}

export class InMemoryEmailAdapter implements EmailAdapter {
  public readonly sent: Array<{
    to: string;
    subject: string;
    html: string;
    text: string;
  }> = [];

  async sendEmail({ to, subject, html, text }: Parameters<EmailAdapter["sendEmail"]>[0]): Promise<void> {
    this.sent.push({ to, subject, html, text });
  }
}
