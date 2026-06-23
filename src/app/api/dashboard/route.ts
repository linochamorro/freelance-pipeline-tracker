import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getDashboardMetrics } from "@/services/dashboard-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const metrics = await getDashboardMetrics(session.user.id);
  return successResponse(metrics);
}
