// src/lib/validations/task.schema.ts
// Esquema Zod para creación/actualización de tareas (contrato API /api/tasks).
// Incluye las 5 opciones de adelanto cerradas (ADR-005).

import { z } from "zod";
import { TASK_LEAD_MINUTES_OPTIONS, type TaskLeadMinutes } from "@/types";
import { IdSchema, OptionalTextSchema, RequiredTextSchema } from "./common.schema";

export const TaskLeadMinutesSchema = z
  .number()
  .int("Los minutos de adelanto deben ser enteros")
  .refine(
    (val) => TASK_LEAD_MINUTES_OPTIONS.includes(val as TaskLeadMinutes),
    { message: "Opción de adelanto no válida" },
  );

export const TaskCreateSchema = z.object({
  title: RequiredTextSchema(2, 200),
  description: OptionalTextSchema(2000),
  dueDate: z
    .string({ required_error: "Fecha límite requerida" })
    .datetime({ message: "Fecha límite inválida (ISO 8601)" }),
  leadMinutes: TaskLeadMinutesSchema,
  opportunityId: IdSchema.optional().nullable(),
});

export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;

export const TaskUpdateSchema = z.object({
  id: IdSchema,
  title: RequiredTextSchema(2, 200).optional(),
  description: OptionalTextSchema(2000).optional(),
  dueDate: z.string().datetime({ message: "Fecha límite inválida (ISO 8601)" }).optional(),
  leadMinutes: TaskLeadMinutesSchema.optional(),
  opportunityId: IdSchema.optional().nullable(),
  completed: z.boolean().optional(),
});

export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>;

export const TaskParamsSchema = z.object({
  id: IdSchema,
});

export type TaskParams = z.infer<typeof TaskParamsSchema>;
