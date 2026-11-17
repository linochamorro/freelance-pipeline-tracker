// src/app/api/auth/logout/route.ts
// Route Handler POST /api/auth/logout
// Elimina la sesión persistente por token leído de la cookie y expira la
// cookie (Max-Age=0). Idempotente: responde 200 ok(null) SIEMPRE, con o sin
// cookie, y aunque el token ya no exista.

import { NextResponse } from "next/server";
import { ok } from "../../../../lib/api-response";
import { deleteSession } from "../../../../services/session-service";

const SESSION_COOKIE_NAME = "sessionToken";

export function expiredSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };
}

/**
 * Extrae el token de sesión de la cabecera Cookie de la solicitud.
 * No depende de next/headers para permitir logout idempotente incluso
 * con sesiones inválidas o expiradas.
 */
export function readSessionTokenFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      return rest.join("=") || null;
    }
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const token = readSessionTokenFromCookieHeader(request.headers.get("cookie"));
  if (token) {
    await deleteSession(token);
  }

  const res = NextResponse.json(ok(null), { status: 200 });
  res.cookies.set(SESSION_COOKIE_NAME, "", expiredSessionCookieOptions());
  return res;
}
