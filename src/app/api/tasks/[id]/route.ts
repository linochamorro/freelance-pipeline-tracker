// src/app/api/tasks/[id]/route.ts
// Route Handlers PATCH y DELETE /api/tasks/[id]
// Actualización y eliminación de tareas con verificación de pertenencia.
// Consume task-service de F03-T01. Todas las respuestas usan ApiResponse<T>.

import { z } from "zod";
import { TaskParamsSchema, TaskUpdateSchema } from "../../../../lib/validations";
import { ok, fail, toErrorResponse } from "../../../../lib/api-response";
import { getSessionUserId } from "../../../../lib/session";
import {
  updateTask,
  markTaskCompleted,
  deleteTask,
} from "../../../../services/task-service";
import type { TaskUpdateData } from "../../../../services/task-service";
import type { TaskLeadMinutes } from "../../../../types";

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
      fail("UNAUTHORIZED", "Sesión requerida para actualizar tarea"),
      401,
    );
  }

  const { id } = await Promise.resolve(context.params);
  const paramsParsed = TaskParamsSchema.safeParse({ id });
  if (!paramsParsed.success) {
    return jsonResponse(
      fail("VALIDATION_ERROR", "ID de tarea inválido"),
      400,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      fail("VALIDATION_ERROR", "Cuerpo de solicitud inválido"),
      400,
    );
  }

  const bodyRecord = body as Record<string, unknown>;
  const bodyWithId = { ...bodyRecord, id };
  const parsed = TaskUpdateSchema.safeParse(bodyWithId);
  if (!parsed.success) {
    return jsonResponse(
      fail(
        "VALIDATION_ERROR",
        "Datos de actualización inválidos",
        parsed.error.flatten().fieldErrors,
      ),
      400,
    );
  }

  const input: TaskUpdateData = {
    title: parsed.data.title,
    description: parsed.data.description ?? undefined,
    dueDate: parsed.data.dueDate,
    leadMinutes: (parsed.data.leadMinutes ?? undefined) as TaskLeadMinutes | undefined,
    opportunityId: parsed.data.opportunityId,
    completed: parsed.data.completed,
  };

  try {
    if (input.completed === true) {
      const task = await markTaskCompleted(id, userId);
      return jsonResponse(ok(task), 200);
    }

    const task = await updateTask(id, userId, input);
    return jsonResponse(ok(task), 200);
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Error al actualizar tarea",
    });
    return jsonResponse(body, status);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para eliminar tarea"),
      401,
    );
  }

  const { id } = await Promise.resolve(context.params);
  const paramsParsed = TaskParamsSchema.safeParse({ id });
  if (!paramsParsed.success) {
    return jsonResponse(
      fail("VALIDATION_ERROR", "ID de tarea inválido"),
      400,
    );
  }

  try {
    await deleteTask(id, userId);
    return new Response(null, { status: 204 });
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Error al eliminar tarea",
    });
    return jsonResponse(body, status);
  }
}
