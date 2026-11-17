// src/app/api/notifications/route.ts
// Route Handler GET /api/notifications
// Lista notificaciones del usuario autenticado, ordenadas por triggerAt asc.
// Consulta Prisma directamente (sin task-service). Todas las respuestas usan ApiResponse<T>.

import { ok, fail } from "../../../lib/api-response";
import { getSessionUserId } from "../../../lib/session";
import { prisma } from "../../../services/task-service";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para listar notificaciones"),
      401,
    );
  }

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { triggerAt: "asc" },
  });

  return jsonResponse(ok(notifications), 200);
}
