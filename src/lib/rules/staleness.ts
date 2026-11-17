// src/lib/rules/staleness.ts
// Reglas puras de dominio para el cálculo de inactividad (staleness) de oportunidades.
// Parametrizado por umbrales de UserSettings (ADR-003). Sin valor hardcodeado de 7.
// Funciones deterministas sin efectos secundarios. Congelado en F01-T06.

import type { PipelineStage } from "@/types";

// Umbral por defecto de inicialización (fallback) cuando el usuario recién
// registrado no ha personalizado su configuración (ADR-003, punto 3).
export const DEFAULT_STALENESS_DAYS = 7;

/**
 * Umbrales de inactividad por etapa del pipeline (días).
 * Los valores son números enteros positivos. No hay valores hardcodeados
 * salvo el DEFAULT_STALENESS_DAYS que solo se aplica como fallback externo.
 */
export interface StalenessThresholds {
  prospectionStalenessDays: number;
  proposalStalenessDays: number;
  executionStalenessDays: number;
  billingStalenessDays: number;
  closedStalenessDays: number;
}

/**
 * Mapea cada etapa del pipeline a su campo de umbral correspondiente en
 * StalenessThresholds. Umbral por etapa, configurable por usuario.
 */
export const STAGE_STALENESS_FIELD: Readonly<
  Record<PipelineStage, keyof StalenessThresholds>
> = {
  Lead: "prospectionStalenessDays",
  Contacted: "prospectionStalenessDays",
  MeetingScheduled: "proposalStalenessDays",
  BriefReceived: "proposalStalenessDays",
  ProposalSent: "proposalStalenessDays",
  Negotiation: "proposalStalenessDays",
  Accepted: "executionStalenessDays",
  InProgress: "executionStalenessDays",
  Completed: "closedStalenessDays",
  Rejected: "closedStalenessDays",
};

/**
 * Obtiene el número de días de inactividad configurado para una etapa dada.
 * Devuelve el umbral de `thresholds` para la etapa. No aplica fallback aquí:
 * el fallback de DEFAULT_STALENESS_DAYS se reserva al nivel de inicialización
 * de UserSettings (ADR-003, punto 3).
 */
export function getStalenessDaysForStage(
  stage: PipelineStage,
  thresholds: StalenessThresholds,
): number {
  const field = STAGE_STALENESS_FIELD[stage];
  return thresholds[field];
}

/**
 * Calcula la fecha límite de inactividad de una oportunidad.
 * Una oportunidad está "stale" cuando su updatedAt supera el umbral en días
 * configurado para su etapa. Devuelve la fecha límite (updatedAt + umbral días).
 * Función pura: no muta argumentos, no efectos secundarios.
 */
export function calculateStalenessDeadline(
  updatedAt: Date,
  stage: PipelineStage,
  thresholds: StalenessThresholds,
): Date {
  const days = getStalenessDaysForStage(stage, thresholds);
  const deadline = new Date(updatedAt.getTime());
  deadline.setDate(deadline.getDate() + days);
  return deadline;
}

/**
 * Indica si una oportunidad está inactiva (stale) en `referenceDate`.
 * Compara la fecha límite calculada contra la referencia recibida.
 * referenceDate default = ahora si se omite (inyección de fecha para pruebas).
 */
export function isStale(
  updatedAt: Date,
  stage: PipelineStage,
  thresholds: StalenessThresholds,
  referenceDate: Date = new Date(),
): boolean {
  const deadline = calculateStalenessDeadline(updatedAt, stage, thresholds);
  return referenceDate.getTime() > deadline.getTime();
}

/**
 * Umbrales de inactividad con valores por defecto de inicialización (7 días
 * para cada campo) cuando el usuario no ha personalizado (ADR-003, punto 3).
 * Se usa únicamente como fallback de inicialización de UserSettings.
 */
export function defaultStalenessThresholds(): StalenessThresholds {
  return {
    prospectionStalenessDays: DEFAULT_STALENESS_DAYS,
    proposalStalenessDays: DEFAULT_STALENESS_DAYS,
    executionStalenessDays: DEFAULT_STALENESS_DAYS,
    billingStalenessDays: DEFAULT_STALENESS_DAYS,
    closedStalenessDays: DEFAULT_STALENESS_DAYS,
  };
}
