import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  getArchivedOpportunities,
  archiveOpportunity,
  restoreOpportunity,
} from "@/services/opportunity-service";
import { z } from "zod";

const archiveActionSchema = z.object({
  opportunityId: z.string().min(1),
  action: z.enum(["archive", "restore"]),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;

  const opportunities = await getArchivedOpportunities(session.user.id, search);
  return successResponse(opportunities);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const parsed = archiveActionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  try {
    if (parsed.data.action === "archive") {
      await archiveOpportunity(parsed.data.opportunityId, session.user.id);
    } else {
      await restoreOpportunity(parsed.data.opportunityId, session.user.id);
    }
    return successResponse(null);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Operation failed",
      400,
    );
  }
}
