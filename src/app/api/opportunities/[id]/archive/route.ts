// src/app/api/opportunities/[id]/archive/route.ts
// Route Handler POST /api/opportunities/[id]/archive
// Conmutación o asignación de archivo de oportunidades preservando su etapa original del pipeline.
// Aislamiento estricto por userId (previsión IDOR).
// Cumple con el contrato estandarizado ApiResponse<T>.

import {
  OpportunityArchiveBodySchema,
  OpportunityParamsSchema,
} from "../../../../../lib/validations/opportunity.schema";
import { ok, fail, toErrorResponse } from "../../../../../lib/api-response";
import { getSessionUserId } from "../../../../../lib/session";
import {
  archiveOpportunity,
  unarchiveOpportunity,
} from "../../../../../services/archive-service";
import { getOpportunityById } from "../../../../../services/opportunity-service";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function invalidBodyResponse(): Response {
  return jsonResponse(
    fail("VALIDATION_ERROR", "Cuerpo de solicitud inválido"),
    400,
  );
}

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para archivar oportunidad"),
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

  // H-5 (F05-T01 loop 2/3): validación del cuerpo con esquema Zod.
  // Se conserva la semántica previa: cuerpo ausente/vacío => toggle;
  // isArchived booleano => archive/unarchive explícito; action => archive/unarchive.
  let rawBody: unknown = {};
  try {
    const text = await request.text();
    if (text && text.trim()) {
      rawBody = JSON.parse(text);
    }
  } catch {
    return invalidBodyResponse();
  }

  const bodyParsed = OpportunityArchiveBodySchema.safeParse(rawBody);
  if (!bodyParsed.success) {
    return invalidBodyResponse();
  }
  const body = bodyParsed.data;

  try {
    let result;
    if (typeof body.isArchived === "boolean") {
      result = body.isArchived
        ? await archiveOpportunity(id, userId)
        : await unarchiveOpportunity(id, userId);
    } else if (body.action === "unarchive") {
      result = await unarchiveOpportunity(id, userId);
    } else if (body.action === "archive") {
      result = await archiveOpportunity(id, userId);
    } else {
      // Alternancia (toggle): consultar estado actual y conmutar
      const existing = await getOpportunityById(id, userId);
      result = existing.isArchived
        ? await unarchiveOpportunity(id, userId)
        : await archiveOpportunity(id, userId);
    }

    return jsonResponse(ok(result), 200);
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Error al archivar oportunidad",
    });
    return jsonResponse(body, status);
  }
}
