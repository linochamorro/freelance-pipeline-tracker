// src/app/api/tasks/route.ts
// Route Handlers GET y POST /api/tasks
// Gestión de tareas del usuario autenticado (sesión validada en servidor).
// Consume task-service de F03-T01. Todas las respuestas usan ApiResponse<T>.

import { TaskCreateSchema, TaskParamsSchema } from "../../../lib/validations";
import { ok, fail } from "../../../lib/api-response";
import { getSessionUserId } from "../../../lib/session";
import { createTask, listTasks } from "../../../services/task-service";
import type { TaskCreateData } from "../../../services/task-service";
import type { TaskLeadMinutes } from "../../../types";

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
      fail("UNAUTHORIZED", "Sesión requerida para listar tareas"),
      401,
    );
  }

  const tasks = await listTasks(userId);
  return jsonResponse(ok(tasks), 200);
}

export async function POST(request: Request): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para crear tarea"),
      401,
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

  const parsed = TaskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      fail(
        "VALIDATION_ERROR",
        "Datos de tarea inválidos",
        parsed.error.flatten().fieldErrors,
      ),
      400,
    );
  }

  const input: TaskCreateData = {
    userId,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    dueDate: parsed.data.dueDate,
    leadMinutes: parsed.data.leadMinutes as TaskLeadMinutes,
    opportunityId: parsed.data.opportunityId,
  };

  const task = await createTask(input);
  return jsonResponse(ok(task), 201);
}
