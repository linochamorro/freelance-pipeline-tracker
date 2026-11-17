// src/app/api/auth/login/route.ts
// Route Handler POST /api/auth/login
// Verifica credenciales con bcrypt.compare, crea sesión persistente y
// establece la cookie httpOnly. ADR-006 (no enumeración): email inexistente
// y contraseña incorrecta devuelven exactamente la misma respuesta 401
// INVALID_CREDENTIALS, con retardo uniforme (~100 ms) en la vía del email
// inexistente para equiparar tiempos (patrón de auth-reset-service).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { LoginSchema } from "../../../../lib/validations/auth.schema";
import { ok, fail } from "../../../../lib/api-response";
import {
  prisma,
  LOGIN_SENTINEL_HASH,
  isValidCost12BcryptHash,
} from "../../../../services/auth-service";
import { createSession } from "../../../../services/session-service";
import { enforceRateLimit, resetRateLimit } from "../../../../lib/rate-limit";

const SESSION_COOKIE_NAME = "sessionToken";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 días (2592000 s)
const UNIFORM_DELAY_MS = 100; // retardo uniforme para mitigación de timing attacks
const INVALID_CREDENTIALS_MESSAGE = "Credenciales inválidas";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

function uniformDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      fail(
        "VALIDATION_ERROR",
        "Credenciales inválidas",
        parsed.error.flatten().fieldErrors,
      ),
      { status: 400 },
    );
  }

  // H-4: límite de intentos por email (primario) e IP (secundaria), evaluado
  // antes de tocar la base de datos. Respuesta idéntica para emails existentes
  // e inexistentes (no oráculo de enumeración, ADR-006).
  const limited = enforceRateLimit(request, "login", parsed.data.email);
  if (limited) return limited;

  // Búsqueda por email; la respuesta no revela si el email existe (ADR-006).
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // H-1: las tres vías ejecutan trabajo bcrypt real de coste 12. En
  // «usuario inexistente» y «usuario existente sin hash válido» se compara
  // contra el hash centinela fijo; en «usuario con hash válido» se usa el
  // hash almacenado. Así el tiempo de respuesta no delata la existencia.
  const storedHash = user?.passwordHash ?? null;
  const hashToCompare = isValidCost12BcryptHash(storedHash)
    ? storedHash
    : LOGIN_SENTINEL_HASH;
  const passwordMatches = await bcrypt.compare(parsed.data.password, hashToCompare as string);

  if (!user || !passwordMatches) {
    // Vía uniforme: mismo status, mismo código, mismo mensaje y mismo retardo
    // (~100 ms) independientemente de si el email existe o no (ADR-006).
    await uniformDelay(UNIFORM_DELAY_MS);
    return NextResponse.json(
      fail("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE),
      { status: 401 },
    );
  }

  const { sessionToken } = await createSession(user.id);

  // H-4: el contador de intentos fallidos se reinicia tras un login exitoso.
  resetRateLimit("login", parsed.data.email, request);

  // Datos públicos: nunca passwordHash ni el token en el body.
  const res = NextResponse.json(
    ok({ id: user.id, name: user.name, email: user.email }),
    { status: 200 },
  );
  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
  return res;
}
