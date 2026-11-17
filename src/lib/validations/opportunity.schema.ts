// src/lib/validations/opportunity.schema.ts
// Esquema Zod para creación/actualización de oportunidades (contrato API /api/opportunities).
// Los enums provienen de src/types (canónicos, sincronizados con Prisma).

import { z } from "zod";
import {
  ContactChannelEnum,
  DevelopmentStatusEnum,
  PaymentStatusEnum,
  PipelineStageEnum,
} from "@/types";
import { IdSchema, NonNegativeMoneySchema, OptionalTextSchema, RequiredTextSchema } from "./common.schema";

export const OpportunityCreateSchema = z.object({
  clientName: RequiredTextSchema(2, 200),
  description: RequiredTextSchema(5, 2000),
  estimatedBudget: NonNegativeMoneySchema,
  contactPersonName: RequiredTextSchema(2, 200),
  contactChannel: z.nativeEnum(ContactChannelEnum, {
    required_error: "Canal de contacto requerido",
    invalid_type_error: "Canal de contacto no válido",
  }),
  pipelineStage: z.nativeEnum(PipelineStageEnum).optional(),
  paymentStatus: z.nativeEnum(PaymentStatusEnum).optional().nullable(),
  developmentStatus: z.nativeEnum(DevelopmentStatusEnum).optional().nullable(),
});

export type OpportunityCreateInput = z.infer<typeof OpportunityCreateSchema>;

export const OpportunityUpdateSchema = z.object({
  id: IdSchema,
  clientName: RequiredTextSchema(2, 200).optional(),
  description: RequiredTextSchema(5, 2000).optional(),
  estimatedBudget: NonNegativeMoneySchema.optional(),
  contactPersonName: RequiredTextSchema(2, 200).optional(),
  contactChannel: z.nativeEnum(ContactChannelEnum).optional(),
  pipelineStage: z.nativeEnum(PipelineStageEnum).optional(),
  paymentStatus: z.nativeEnum(PaymentStatusEnum).optional().nullable(),
  developmentStatus: z.nativeEnum(DevelopmentStatusEnum).optional().nullable(),
  isArchived: z.boolean().optional(),
});

export type OpportunityUpdateInput = z.infer<typeof OpportunityUpdateSchema>;

export const OpportunityParamsSchema = z.object({
  id: IdSchema,
});

export type OpportunityParams = z.infer<typeof OpportunityParamsSchema>;

/**
 * Acciones admitidas por el endpoint de archivo/restitución.
 * (H-5, F05-T01 loop 2/3: validación Zod del cuerpo del endpoint de archivo)
 */
export const OpportunityArchiveActionSchema = z.enum(["archive", "unarchive"]);

export type OpportunityArchiveAction = z.infer<
  typeof OpportunityArchiveActionSchema
>;

/**
 * Cuerpo del endpoint POST /api/opportunities/[id]/archive.
 *
 * - Ambos campos son opcionales: si no llega ninguno, la operación es un toggle.
 * - `isArchived` debe ser booleano estricto (no acepta strings ni números).
 * - `action` sólo admite "archive" | "unarchive".
 * - La raíz debe ser un objeto: arrays, strings, null u otros tipos se rechazan.
 */
export const OpportunityArchiveBodySchema = z.object({
  isArchived: z.boolean().optional(),
  action: OpportunityArchiveActionSchema.optional(),
});

export type OpportunityArchiveBody = z.infer<
  typeof OpportunityArchiveBodySchema
>;
