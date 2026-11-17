// src/lib/rules/substate-activation.ts
// Reglas puras de dominio para activación de subestados (DevelopmentStatus / PaymentStatus).
// Funciones deterministas sin efectos secundarios. Congelado en F01-T05.

import type { DevelopmentStatus, PaymentStatus, PipelineStage } from "@/types";

// --- DevelopmentStatus: 4 valores canónicos, activables solo desde etapa Accepted ---
export const DEVELOPMENT_STATUSES: readonly DevelopmentStatus[] = [
  "NotStarted",
  "InProgress",
  "InReview",
  "Delivered",
] as const;

export const DEVELOPMENT_ACTIVATION_STAGE: PipelineStage = "Accepted";

// --- PaymentStatus: 4 valores canónicos, activables solo desde etapa ProposalSent ---
export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "Pending",
  "PartialPaid",
  "Paid",
  "Refunded",
] as const;

export const PAYMENT_ACTIVATION_STAGE: PipelineStage = "ProposalSent";

/**
 * Valida que un valor sea un DevelopmentStatus canónico.
 */
export function isValidDevelopmentStatus(
  value: string,
): value is DevelopmentStatus {
  return DEVELOPMENT_STATUSES.includes(value as DevelopmentStatus);
}

/**
 * Valida que un valor sea un PaymentStatus canónico.
 */
export function isValidPaymentStatus(value: string): value is PaymentStatus {
  return PAYMENT_STATUSES.includes(value as PaymentStatus);
}

/**
 * Indica si se puede activar un DevelopmentStatus en la etapa dada.
 * Solo permite activación cuando la etapa es exactamente "Accepted".
 */
export function canActivateDevelopmentStatus(
  stage: string,
  status: DevelopmentStatus,
): boolean {
  return (
    stage === DEVELOPMENT_ACTIVATION_STAGE && isValidDevelopmentStatus(status)
  );
}

/**
 * Indica si se puede activar un PaymentStatus en la etapa dada.
 * Solo permite activación cuando la etapa es exactamente "ProposalSent".
 */
export function canActivatePaymentStatus(
  stage: string,
  status: PaymentStatus,
): boolean {
  return stage === PAYMENT_ACTIVATION_STAGE && isValidPaymentStatus(status);
}

/**
 * Devuelve los DevelopmentStatus permitidos para activar desde `stage`.
 * Solo desde "Accepted" devuelve los 4; cualquier otra etapa devuelve lista vacía.
 */
export function getAllowedDevelopmentStatuses(
  stage: string,
): readonly DevelopmentStatus[] {
  return stage === DEVELOPMENT_ACTIVATION_STAGE ? DEVELOPMENT_STATUSES : [];
}

/**
 * Devuelve los PaymentStatus permitidos para activar desde `stage`.
 * Solo desde "ProposalSent" devuelve los 4; cualquier otra etapa devuelve lista vacía.
 */
export function getAllowedPaymentStatuses(
  stage: string,
): readonly PaymentStatus[] {
  return stage === PAYMENT_ACTIVATION_STAGE ? PAYMENT_STATUSES : [];
}
