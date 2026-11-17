// src/app/api/opportunities/[id]/route.ts
// Route Handlers GET, PATCH y DELETE /api/opportunities/[id]
// Detalle, mutación (transición Kanban y subestados) y eliminación con aislamiento estricto por userId (IDOR).
// Cumple con el contrato estandarizado ApiResponse<T>.

import {
  OpportunityParamsSchema,
  OpportunityUpdateSchema,
} from "../../../../lib/validations/opportunity.schema";
import { ok, fail, toErrorResponse } from "../../../../lib/api-response";
import { getSessionUserId } from "../../../../lib/session";
import {
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
} from "../../../../services/opportunity-service";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para consultar oportunidad"),
      401,
    );
  }

  const { id } = await Promise.resolve(context.params);
  const paramsParsed = OpportunityParamsSchema.safeParse({ id });
  if (!paramsParsed.success) {
    return jsonResponse(
      fail("VALIDATION_ERROR", "ID de oportunidad inválido"),
      400,
    );
  }

  try {
    const opp = await getOpportunityById(id, userId);
    return jsonResponse(ok(opp), 200);
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Error al obtener oportunidad",
    });
    return jsonResponse(body, status);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para actualizar oportunidad"),
      401,
    );
  }

  const { id } = await Promise.resolve(context.params);
  const paramsParsed = OpportunityParamsSchema.safeParse({ id });
  if (!paramsParsed.success) {
    return jsonResponse(
      fail("VALIDATION_ERROR", "ID de oportunidad inválido"),
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

  const bodyRecord =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const parsed = OpportunityUpdateSchema.safeParse({ ...bodyRecord, id });
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

  try {
    const updated = await updateOpportunity(id, userId, {
      ...parsed.data,
      observation:
        typeof bodyRecord.observation === "string"
          ? bodyRecord.observation
          : undefined,
    });
    return jsonResponse(ok(updated), 200);
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Error al actualizar oportunidad",
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
      fail("UNAUTHORIZED", "Sesión requerida para eliminar oportunidad"),
      401,
    );
  }

  const { id } = await Promise.resolve(context.params);
  const paramsParsed = OpportunityParamsSchema.safeParse({ id });
  if (!paramsParsed.success) {
    return jsonResponse(
      fail("VALIDATION_ERROR", "ID de oportunidad inválido"),
      400,
    );
  }

  try {
    const deleted = await deleteOpportunity(id, userId);
    return jsonResponse(ok(deleted), 200);
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Error al eliminar oportunidad",
    });
    return jsonResponse(body, status);
  }
}
