// src/app/api/dashboard/route.ts
// Route Handler GET /api/dashboard
// Requiere sesión activa. Llama dashboard-service.getDashboardMetrics con los
// umbrales de UserSettings del usuario y responde ApiResponse con métricas +
// lista de oportunidades inactivas (stale) (ADR-003).

import { getSessionUserId } from "../../../lib/session";
import { getUserSettings } from "../../../services/settings-service";
import { getDashboardMetrics } from "../../../services/dashboard-service";
import { ok, fail } from "../../../lib/api-response";

async function handleDashboard(request: Request): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para acceder al dashboard"),
      401,
    );
  }

  const settings = await getUserSettings(userId);
  const thresholds = {
    prospectionStalenessDays: settings.prospectionStalenessDays,
    proposalStalenessDays: settings.proposalStalenessDays,
    executionStalenessDays: settings.executionStalenessDays,
    billingStalenessDays: settings.billingStalenessDays,
    closedStalenessDays: settings.closedStalenessDays,
  };

  const metrics = await getDashboardMetrics(userId, thresholds);
  return jsonResponse(ok(metrics), 200);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request): Promise<Response> {
  return handleDashboard(request);
}

// Exportado para pruebas de integración
export { handleDashboard };
