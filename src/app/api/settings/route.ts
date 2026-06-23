import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getUserSettings, updateUserSettings } from "@/services/settings-service";
import { z } from "zod";

const updateSettingsSchema = z.object({
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const settings = await getUserSettings(session.user.id);
  return successResponse(settings);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  const settings = await updateUserSettings(session.user.id, parsed.data);
  return successResponse(settings);
}
