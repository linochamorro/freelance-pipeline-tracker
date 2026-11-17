// src/app/api/auth/request-reset/route.ts
// Route Handler POST /api/auth/request-reset
// Solicitud de restablecimiento de contraseña (ADR-006: respuesta no enumeradora).
// Genera token criptográfico, guarda VerificationToken, envía correo y responde 200
// OK idéntico siempre, independientemente de si el email existe.

import { z } from "zod";
import { requestPasswordReset } from "../../../../services/auth-reset-service";
import {
  EmailAdapter,
  InMemoryEmailAdapter,
  ResendEmailAdapter,
} from "../../../../lib/email-adapter";
import { enforceRateLimit } from "../../../../lib/rate-limit";

const requestResetSchema = z.object({
  email: z.string().email("Correo inválido"),
});

const RESET_MESSAGE =
  "Si el correo está registrado, recibirás un enlace de restablecimiento";

function defaultEmailAdapter(): EmailAdapter {
  // En entorno de prueba/desarrollo sin RESEND_API_KEY se usa el adapter en memoria (ADR-007).
  // Nunca se imprime ni se expone el valor de la clave de API.
  if (process.env.RESEND_API_KEY) {
    return new ResendEmailAdapter(
      process.env.RESEND_API_KEY,
      process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    );
  }
  return new InMemoryEmailAdapter();
}

async function handleRequestReset(
  request: Request,
  emailAdapter: EmailAdapter,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Cuerpo no parseable: respuesta uniforme sin revelar nada
    return jsonResponse({ message: RESET_MESSAGE }, 200);
  }

  const parsed = requestResetSchema.safeParse(body);
  if (!parsed.success) {
    // Email con formato inválido: error de validación, nunca se consulta existencia del email
    return jsonResponse(
      { success: false, error: { code: "INVALID_EMAIL", message: "Correo inválido" } },
      400,
    );
  }

  // H-4: límite de intentos por email (primario) e IP (secundaria).
  // Respuesta 429 genérica en contrato ApiResponse (no oráculo, ADR-006).
  const limited = enforceRateLimit(request, "request-reset", parsed.data.email);
  if (limited) return limited;

  const result = await requestPasswordReset(parsed.data.email);

  // Solo cuando el usuario existe se envía el correo con el token.
  // Para emails inexistentes no hay token ni envío, y la respuesta HTTP es idéntica (ADR-006).
  if (result.token) {
    await emailAdapter.sendEmail({
      to: parsed.data.email,
      subject: "Restablecimiento de contraseña",
      html: `<p>Utiliza el siguiente token para restablecer tu contraseña: <strong>${result.token}</strong></p>`,
      text: `Utiliza el siguiente token para restablecer tu contraseña: ${result.token}`,
    });
  }

  return jsonResponse({ message: RESET_MESSAGE }, 200);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRequestReset(request, defaultEmailAdapter());
}

// Exportado para pruebas de integración con adaptador inyectable
export { handleRequestReset };
