import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createOpportunitySchema } from "@/lib/validators/opportunity-schema";
import {
  createOpportunity,
  getOpportunitiesByUser,
} from "@/services/opportunity-service";
import { PipelineStage } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const filters = {
    pipelineStage: (searchParams.get("pipelineStage") as PipelineStage) || undefined,
    contactChannel: searchParams.get("contactChannel") || undefined,
    paymentStatus: searchParams.get("paymentStatus") || undefined,
    developmentStatus: searchParams.get("developmentStatus") || undefined,
    search: searchParams.get("search") || undefined,
  };

  const opportunities = await getOpportunitiesByUser(session.user.id, filters);
  return successResponse(opportunities);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const parsed = createOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  const opportunity = await createOpportunity(session.user.id, parsed.data);
  return successResponse(opportunity, 201);
}
