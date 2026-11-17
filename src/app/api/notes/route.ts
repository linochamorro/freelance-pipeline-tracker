// src/app/api/notes/route.ts
// Route Handlers GET y POST /api/notes
// Historial de notas bajo principio estricto Append-Only e inmutabilidad (ADR-002).
// Rechazo activo con HTTP 405 Method Not Allowed en PUT, PATCH, DELETE.
// Cumple con el contrato estandarizado ApiResponse<T>.

import { z } from "zod";
import { IdSchema, RequiredTextSchema } from "../../../lib/validations/common.schema";
import { ok, fail, toErrorResponse } from "../../../lib/api-response";
import { getSessionUserId } from "../../../lib/session";
import { createNote, listNotes } from "../../../services/note-service";

function jsonResponse(
  body: unknown,
  status: number,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

const NoteCreatePayloadSchema = z.object({
  opportunityId: IdSchema,
  content: RequiredTextSchema(1, 5000),
});

export async function GET(request: Request): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para listar notas"),
      401,
    );
  }

  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get("opportunityId");
  if (!opportunityId) {
    return jsonResponse(
      fail("VALIDATION_ERROR", "opportunityId es requerido como parámetro de consulta"),
      400,
    );
  }

  const idParsed = IdSchema.safeParse(opportunityId);
  if (!idParsed.success) {
    return jsonResponse(
      fail("VALIDATION_ERROR", "opportunityId inválido"),
      400,
    );
  }

  try {
    const notes = await listNotes(opportunityId, userId);
    return jsonResponse(ok(notes), 200);
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Error al listar notas",
    });
    return jsonResponse(body, status);
  }
}

export async function POST(request: Request): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para crear nota"),
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

  const parsed = NoteCreatePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      fail(
        "VALIDATION_ERROR",
        "Datos de nota inválidos",
        parsed.error.flatten().fieldErrors,
      ),
      400,
    );
  }

  try {
    const note = await createNote({
      opportunityId: parsed.data.opportunityId,
      userId,
      content: parsed.data.content,
    });
    return jsonResponse(ok(note), 201);
  } catch (err) {
    const { status, body } = toErrorResponse(err, {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Error al registrar nota",
    });
    return jsonResponse(body, status);
  }
}

// Inmutabilidad de Notas (ADR-002) - HTTP 405 Method Not Allowed
export async function PUT(): Promise<Response> {
  return jsonResponse(
    fail("METHOD_NOT_ALLOWED", "Las notas son inmutables y no admiten actualización (ADR-002)"),
    405,
    { Allow: "GET, POST" },
  );
}

export async function PATCH(): Promise<Response> {
  return jsonResponse(
    fail("METHOD_NOT_ALLOWED", "Las notas son inmutables y no admiten modificación parcial (ADR-002)"),
    405,
    { Allow: "GET, POST" },
  );
}

export async function DELETE(): Promise<Response> {
  return jsonResponse(
    fail("METHOD_NOT_ALLOWED", "Las notas son inmutables y no admiten eliminación (ADR-002)"),
    405,
    { Allow: "GET, POST" },
  );
}
