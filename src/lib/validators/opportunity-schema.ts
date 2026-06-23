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
  clientName: z.string().min(1, "Client name is required"),
  description: z.string().min(1, "Description is required"),
  estimatedBudget: z.number().positive("Budget must be positive"),
  contactPersonName: z.string().min(1, "Contact person is required"),
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
