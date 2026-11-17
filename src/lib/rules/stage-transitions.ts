// src/lib/rules/stage-transitions.ts
// Reglas puras de dominio para el tablero Kanban y transiciones de etapa.
// Funciones deterministas sin efectos secundarios. Congelado en F01-T04.

import type { PipelineStage } from "@/types";

// Las 10 etapas del pipeline Kanban, en orden de avance lineal.
export const PIPELINE_STAGES: readonly PipelineStage[] = [
  "Lead",
  "Contacted",
  "MeetingScheduled",
  "BriefReceived",
  "ProposalSent",
  "Negotiation",
  "Accepted",
  "InProgress",
  "Completed",
  "Rejected",
] as const;

// Etapas terminales: bloquean cualquier transición posterior.
export const TERMINAL_STAGES: readonly PipelineStage[] = [
  "Completed",
  "Rejected",
] as const;

/**
 * Indica si un valor es una etapa terminal (Completed o Rejected).
 * Las etapas terminales no admiten transición de salida.
 */
export function isTerminalStage(stage: string): boolean {
  return stage === "Completed" || stage === "Rejected";
}

/**
 * Indica si un valor es el literal "On Hold".
 * No existe en el pipeline; la inactividad temporal se gestiona con archivo.
 */
export function isOnHoldStage(stage: string): boolean {
  return stage === "On Hold";
}

/**
 * Valida que un valor sea una etapa de pipeline canónica.
 */
export function isValidStage(stage: string): stage is PipelineStage {
  return PIPELINE_STAGES.includes(stage as PipelineStage);
}

// Siguiente etapa en el flujo lineal. undefined para etapas terminales.
const NEXT_STAGE: Readonly<Record<PipelineStage, PipelineStage | undefined>> = {
  Lead: "Contacted",
  Contacted: "MeetingScheduled",
  MeetingScheduled: "BriefReceived",
  BriefReceived: "ProposalSent",
  ProposalSent: "Negotiation",
  Negotiation: "Accepted",
  Accepted: "InProgress",
  InProgress: "Completed",
  Completed: undefined,
  Rejected: undefined,
};

/**
 * Devuelve las etapas a las que se puede transicionar desde `from`.
 * Las etapas terminales no tienen transiciones válidas (lista vacía).
 * Desde cualquier etapa no terminal se permite avanzar un paso y rechazar.
 */
export function getValidTransitions(
  from: PipelineStage,
): readonly PipelineStage[] {
  if (isTerminalStage(from)) return [];

  const transitions: PipelineStage[] = [];
  const next = NEXT_STAGE[from];
  if (next) transitions.push(next);
  // Rechazo posible desde cualquier etapa no terminal.
  transitions.push("Rejected");
  return transitions;
}

/**
 * Indica si la transición de `from` a `to` es válida.
 * Bloquea: origen inválido o terminal, destino inválido o "On Hold",
 * y cualquier transición no contemplada en `getValidTransitions`.
 */
export function canTransition(from: string, to: string): boolean {
  if (!isValidStage(from)) return false;
  if (isTerminalStage(from)) return false;
  if (!isValidStage(to)) return false;
  if (isOnHoldStage(to)) return false;
  return getValidTransitions(from).includes(to);
}
