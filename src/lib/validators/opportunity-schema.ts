import { z } from "zod";

export const pipelineStageEnum = z.enum([
  "Lead",
  "Contacted",
  "InDiscussion",
  "ProposalSent",
  "Negotiation",
  "Accepted",
  "Rejected",
  "OnHold",
  "InDevelopment",
  "Completed",
]);

export const contactChannelEnum = z.enum([
  "LinkedIn",
  "Email",
  "Referral",
  "ColdOutreach",
  "WhatsApp",
  "Other",
]);

export const paymentStatusEnum = z.enum(["Quoted", "Pending", "Collected"]);

export const developmentStatusEnum = z.enum([
  "Pending",
  "InProgress",
  "OnPause",
  "Completed",
]);

export const createOpportunitySchema = z.object({
  clientName: z.string().min(1, "El nombre del cliente es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  estimatedBudget: z.number().positive("El presupuesto debe ser positivo"),
  contactPersonName: z.string().min(1, "La persona de contacto es obligatoria"),
  contactChannel: contactChannelEnum,
});

export const updateOpportunitySchema = z.object({
  clientName: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  estimatedBudget: z.number().positive().optional(),
  contactPersonName: z.string().min(1).optional(),
  contactChannel: contactChannelEnum.optional(),
  pipelineStage: pipelineStageEnum.optional(),
  paymentStatus: paymentStatusEnum.nullable().optional(),
  developmentStatus: developmentStatusEnum.nullable().optional(),
});

export const TERMINAL_STAGES = ["Rejected", "Completed"] as const;

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
