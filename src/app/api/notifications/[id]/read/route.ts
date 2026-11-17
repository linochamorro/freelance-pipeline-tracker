// src/app/api/notifications/[id]/read/route.ts
// Route Handler PATCH /api/notifications/[id]/read
// Marca una notificación como leída en app (readInApp = true).
// Verifica pertenencia por userId antes de actualizar. Todas las respuestas usan ApiResponse<T>.

import { TaskParamsSchema } from "../../../../../lib/validations";
import { ok, fail } from "../../../../../lib/api-response";
import { getSessionUserId } from "../../../../../lib/session";
import { prisma } from "../../../../../services/task-service";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para marcar notificación"),
      401,
    );
  }

  const { id } = await Promise.resolve(context.params);
  const paramsParsed = TaskParamsSchema.safeParse({ id });
  if (!paramsParsed.success) {
    return jsonResponse(
      fail("VALIDATION_ERROR", "ID de notificación inválido"),
      400,
    );
  }

  const existing = await prisma.notification.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    return jsonResponse(
      fail("NOT_FOUND", "Notificación no encontrada o no pertenece al usuario"),
      404,
    );
  }

  const notification = await prisma.notification.update({
    where: { id },
    data: { readInApp: true },
    select: { id: true, readInApp: true, userId: true },
  });

  return jsonResponse(ok(notification), 200);
}
