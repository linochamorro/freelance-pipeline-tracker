import { z } from "zod";

export const createNoteSchema = z.object({
  opportunityId: z.string().min(1, "Opportunity ID is required"),
  content: z.string().min(1, "Note content is required"),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
