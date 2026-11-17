// src/app/api/settings/route.ts
// Route Handlers GET y PUT /api/settings
// Requieren sesión activa. Gestionan UserSettings del usuario autenticado,
// validados con SettingsUpdateSchema, y responden ApiResponse (ADR-003).

import { z } from "zod";
import { getSessionUserId } from "../../../lib/session";
import { getUserSettings, updateUserSettings } from "../../../services/settings-service";
import { SettingsUpdateSchema } from "../../../lib/validations";
import { ok, fail } from "../../../lib/api-response";

async function handleGetSettings(request: Request): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para acceder a la configuración"),
      401,
    );
  }

  const settings = await getUserSettings(userId);
  return jsonResponse(ok(settings), 200);
}

async function handlePutSettings(request: Request): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonResponse(
      fail("UNAUTHORIZED", "Sesión requerida para actualizar la configuración"),
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

  const parsed = SettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      fail(
        "VALIDATION_ERROR",
        "Datos de configuración inválidos",
        parsed.error.flatten().fieldErrors,
      ),
      400,
    );
  }

  // `updateUserSettings` valida con SettingsUpdateSchema, usa userId para el WHERE
  // e ignora el campo `id` del payload.
  const updated = await updateUserSettings(userId, parsed.data);
  return jsonResponse(ok(updated), 200);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request): Promise<Response> {
  return handleGetSettings(request);
}

export async function PUT(request: Request): Promise<Response> {
  return handlePutSettings(request);
}

// Exportado para pruebas de integración
export { handleGetSettings, handlePutSettings };
