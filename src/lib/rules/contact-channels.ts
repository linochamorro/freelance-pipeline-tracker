// src/lib/rules/contact-channels.ts
// Reglas puras de dominio para canales de contacto (exactamente 7, ADR-004).
// Funciones deterministas sin efectos secundarios. Congelado en F01-T05.

import type { ContactChannel } from "@/types";

// Los 7 canales de contacto canónicos (ADR-004).
export const CONTACT_CHANNELS: readonly ContactChannel[] = [
  "LinkedIn",
  "Email",
  "Referral",
  "ColdOutreach",
  "WhatsApp",
  "Phone",
  "Other",
] as const;

export const CONTACT_CHANNEL_COUNT: number = CONTACT_CHANNELS.length;

/**
 * Valida que un valor sea un ContactChannel canónico.
 */
export function isValidContactChannel(value: string): value is ContactChannel {
  return CONTACT_CHANNELS.includes(value as ContactChannel);
}

/**
 * Devuelve la lista inmutable de los 7 canales de contacto.
 */
export function getContactChannels(): readonly ContactChannel[] {
  return CONTACT_CHANNELS;
}
