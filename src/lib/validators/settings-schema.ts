import { z } from "zod";

export const updateSettingsSchema = z.object({
  leadStalenessDays: z.number().int().min(1).max(365).optional(),
  contactedStalenessDays: z.number().int().min(1).max(365).optional(),
  discussionStalenessDays: z.number().int().min(1).max(365).optional(),
  proposalStalenessDays: z.number().int().min(1).max(365).optional(),
  negotiationStalenessDays: z.number().int().min(1).max(365).optional(),
  acceptedStalenessDays: z.number().int().min(1).max(365).optional(),
  onHoldStalenessDays: z.number().int().min(1).max(365).optional(),
  developmentStalenessDays: z.number().int().min(1).max(365).optional(),
  notificationEnabled: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
