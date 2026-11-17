// src/app/api/auth/reset-password/route.ts
// Route Handler POST /api/auth/reset-password
// Confirmación de restablecimiento de contraseña con token de uso único.
// Valida el token en VerificationToken, actualiza passwordHash (bcrypt) e invalida
// el tras su consumo. Responde 200 OK sin revelar si el token era válido (ADR-006).

import { z } from "zod";
import { consumePasswordResetToken } from "../../../../services/auth-reset-service";
import { enforceRateLimit } from "../../../../lib/rate-limit";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const OK_MESSAGE =
  "Si el token era válido, la contraseña se ha actualizado correctamente";

async function handleResetPassword(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: OK_MESSAGE }, 200);
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    // Error de validación del cuerpo: nunca revela validez del token
    return jsonResponse(
      { success: false, error: { code: "INVALID_REQUEST", message: "Token y contraseña requeridos" } },
      400,
    );
  }

  // H-4: límite de intentos por token (identificador primario, hasheado en
  // memoria) e IP (secundaria). 429 genérico en contrato ApiResponse.
  const limited = enforceRateLimit(request, "reset-password", parsed.data.token);
  if (limited) return limited;

  // H-3: reclamo atómico del token (deleteMany con conteo==1), invalidación de
  // todas las sesiones del usuario y actualización de contraseña en una única
  // transacción y una única instancia de PrismaClient. El token se consume
  // también sin usuario. La respuesta sigue siendo 200 fijo (ADR-006).
  await consumePasswordResetToken(parsed.data.token, parsed.data.password);

  return jsonResponse({ message: OK_MESSAGE }, 200);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleResetPassword(request);
}

// Exportado para pruebas de integración
export { handleResetPassword };
