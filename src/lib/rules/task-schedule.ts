// src/lib/rules/task-schedule.ts
// Reglas puras de dominio para la agenda de tareas y cálculo de triggers de
// notificación (ADR-005). Conjunto cerrado de 5 opciones de adelanto.
// Funciones deterministas sin efectos secundarios. Congelado en F01-T06.

import type { TaskLeadMinutes } from "@/types";
export type { TaskLeadMinutes };

// Conjunto cerrado de opciones de anticipación de tareas en minutos (ADR-005).
export const TASK_LEAD_MINUTES_OPTIONS: readonly TaskLeadMinutes[] = [
  15,
  30,
  60,
  120,
  1440,
] as const;

/**
 * Indica si un valor de leadMinutes pertenece al conjunto cerrado de opciones
 * permitidas (ADR-005).
 */
export function isValidLeadMinutes(value: number): value is TaskLeadMinutes {
  return TASK_LEAD_MINUTES_OPTIONS.includes(value as TaskLeadMinutes);
}

/**
 * Calcula la fecha/hora de disparo de la notificación de una tarea.
 * triggerAt = dueDate - leadMinutes. Función pura, testeable sin dependencias
 * externas (ADR-005). No acepta leadMinutes fuera del conjunto cerrado.
 *
 * @throws {Error} si `leadMinutes` no es una opción válida del conjunto cerrado.
 */
export function calculateNotificationTrigger(
  dueDate: Date,
  leadMinutes: TaskLeadMinutes,
): Date {
  if (!isValidLeadMinutes(leadMinutes)) {
    throw new Error(
      `leadMinutes inválido: ${leadMinutes}. Opciones permitidas: ${TASK_LEAD_MINUTES_OPTIONS.join(
        ", ",
      )} minutos.`,
    );
  }
  const triggerAt = new Date(dueDate.getTime());
  triggerAt.setMinutes(triggerAt.getMinutes() - leadMinutes);
  return triggerAt;
}

/**
 * Devuelve la lista inmutable de opciones de adelanto permitidas.
 */
export function getTaskLeadMinutesOptions(): readonly TaskLeadMinutes[] {
  return TASK_LEAD_MINUTES_OPTIONS;
}
