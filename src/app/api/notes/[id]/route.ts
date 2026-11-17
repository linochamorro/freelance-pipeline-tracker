// src/app/api/notes/[id]/route.ts
// Route Handlers para /api/notes/[id]
// Principio estricto Append-Only e inmutabilidad de notas (ADR-002).
// Rechazo activo con HTTP 405 Method Not Allowed ante cualquier intento de mutación o lectura por ID individual.
// Cumple con el contrato estandarizado ApiResponse<T>.

import { fail } from "../../../../lib/api-response";

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

// Inmutabilidad estricta (ADR-002) - HTTP 405 Method Not Allowed
export async function PUT(): Promise<Response> {
  return jsonResponse(
    fail(
      "METHOD_NOT_ALLOWED",
      "Las notas son inmutables y no admiten edición individual (ADR-002)",
    ),
    405,
    { Allow: "" },
  );
}

export async function PATCH(): Promise<Response> {
  return jsonResponse(
    fail(
      "METHOD_NOT_ALLOWED",
      "Las notas son inmutables y no admiten modificación individual (ADR-002)",
    ),
    405,
    { Allow: "" },
  );
}

export async function DELETE(): Promise<Response> {
  return jsonResponse(
    fail(
      "METHOD_NOT_ALLOWED",
      "Las notas son inmutables y no admiten eliminación individual (ADR-002)",
    ),
    405,
    { Allow: "" },
  );
}

export async function GET(): Promise<Response> {
  return jsonResponse(
    fail(
      "METHOD_NOT_ALLOWED",
      "Consultar notas individuales no está soportado; use /api/notes?opportunityId=...",
    ),
    405,
    { Allow: "" },
  );
}

export async function POST(): Promise<Response> {
  return jsonResponse(
    fail(
      "METHOD_NOT_ALLOWED",
      "Creación de notas se realiza en /api/notes (ADR-002)",
    ),
    405,
    { Allow: "" },
  );
}
