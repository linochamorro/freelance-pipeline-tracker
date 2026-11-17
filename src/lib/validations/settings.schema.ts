// src/lib/validations/settings.schema.ts
// Esquema Zod para configuración de usuario / UserSettings (contrato API /api/settings).
// Los umbrales de inactividad son configurables por usuario (ADR-003).

import { z } from "zod";
import { IdSchema } from "./common.schema";

const StalenessDaysSchema = z
  .number()
  .int("Los días de inactividad deben ser enteros")
  .min(1, "Mínimo 1 día")
  .max(365, "Máximo 365 días");

export const SettingsUpdateSchema = z.object({
  id: IdSchema,
  prospectionStalenessDays: StalenessDaysSchema.optional(),
  proposalStalenessDays: StalenessDaysSchema.optional(),
  executionStalenessDays: StalenessDaysSchema.optional(),
  billingStalenessDays: StalenessDaysSchema.optional(),
  closedStalenessDays: StalenessDaysSchema.optional(),
  notificationEnabled: z.boolean().optional(),
});

export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>;

export const SettingsParamsSchema = z.object({
  id: IdSchema,
});

export type SettingsParams = z.infer<typeof SettingsParamsSchema>;
