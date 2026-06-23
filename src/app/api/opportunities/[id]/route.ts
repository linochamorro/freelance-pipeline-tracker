import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { updateOpportunitySchema } from "@/lib/validators/opportunity-schema";
import {
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
} from "@/services/opportunity-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const opportunity = await getOpportunityById(id, session.user.id);
  if (!opportunity) return errorResponse("Opportunity not found", 404);

  return successResponse(opportunity);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const body = await request.json();
  const parsed = updateOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  try {
    const updated = await updateOpportunity(id, session.user.id, parsed.data);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Update failed", 400);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const { id } = await params;

  try {
    await deleteOpportunity(id, session.user.id);
    return successResponse(null);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Delete failed", 400);
  }
}
