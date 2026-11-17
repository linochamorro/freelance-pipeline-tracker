// src/app/api/opportunities/route.ts
// Route Handlers GET y POST /api/opportunities
// Listado con filtros y creación de oportunidades de negocio para el usuario autenticado (sesión validada en servidor).
// Cumple con el contrato estandarizado ApiResponse<T>.

import { OpportunityCreateSchema } from "../../../lib/validations/opportunity.schema";
import { ok, fail, toErrorResponse } from "../../../lib/api-response";
import { getSessionUserId } from "../../../lib/session";
import {
  createOpportunity,
  listOpportunities,
} from "../../../services/opportunity-service";
import type { PipelineStage, ContactChannel } from "../../../types";

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
      fail("UNAUTHORIZED", "Sesión requerida para listar oportunidades"),
      401,
    );
  }

  const { searchParams } = new URL(request.url);
  const isArchivedParam = searchParams.get("isArchived");
  const isArchived = isArchivedParam === "true";
  const stage = (searchParams.get("stage") as PipelineStage) || undefined;
  const channel = (searchParams.get("channel") as ContactChannel) || undefined;

  try {
    let opportunities = await listOpportunities(userId, {
      isArchived,
      stage,
    });

    if (channel) {
      opportunities = opportunities.filter((o) => o.contactChannel === channel);
    }

    return jsonResponse(ok(opportunities), 200);
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Error al listar oportunidades",
    });
    return jsonResponse(body, status);
  }
}

export async function POST(request: Request): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para crear oportunidad"),
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

  const parsed = OpportunityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      fail(
        "VALIDATION_ERROR",
        "Datos de oportunidad inválidos",
        parsed.error.flatten().fieldErrors,
      ),
      400,
    );
  }

  try {
    const opp = await createOpportunity({
      userId,
      ...parsed.data,
    });
    return jsonResponse(ok(opp), 201);
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Error al crear oportunidad",
    });
    return jsonResponse(body, status);
  }
}
