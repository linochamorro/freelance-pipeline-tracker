// src/app/api/auth/register/route.ts
// Route Handler POST /api/auth/register
// Registro de usuario: valida con RegisterSchema, delega en auth-service
// (hash bcrypt), crea sesión persistente y establece la cookie httpOnly.
// Email duplicado → 409 EMAIL_IN_USE. Respuestas en formato ApiResponse<T>.

import { NextResponse } from "next/server";
import { RegisterSchema } from "../../../../lib/validations/auth.schema";
import { ok, fail } from "../../../../lib/api-response";
import { registerUser } from "../../../../services/auth-service";
import { createSession } from "../../../../services/session-service";
import { enforceRateLimit } from "../../../../lib/rate-limit";

const SESSION_COOKIE_NAME = "sessionToken";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 días (2592000 s)

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      fail("VALIDATION_ERROR", "Cuerpo de solicitud inválido"),
      { status: 400 },
    );
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      fail(
        "VALIDATION_ERROR",
        "Datos de registro inválidos",
        parsed.error.flatten().fieldErrors,
      ),
      { status: 400 },
    );
  }

  // H-4: límite de intentos por email (primario) e IP (secundaria).
  const limited = enforceRateLimit(request, "register", parsed.data.email);
  if (limited) return limited;

  try {
    const user = await registerUser(parsed.data);
    const { sessionToken } = await createSession(user.id);

    // Datos públicos del usuario: nunca passwordHash ni el token de sesión.
    const res = NextResponse.json(
      ok({ id: user.id, name: user.name, email: user.email }),
      { status: 201 },
    );
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
    return res;
  } catch (err) {
    // Violación de unicidad de email (Prisma P2002) → 409 no enumerador
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        fail("EMAIL_IN_USE", "El correo ya está registrado"),
        { status: 409 },
      );
    }
    // H-2: nunca exponer texto de excepción interna al cliente.
    return NextResponse.json(
      fail("INTERNAL_ERROR", "Error al registrar el usuario"),
      { status: 500 },
    );
  }
}
