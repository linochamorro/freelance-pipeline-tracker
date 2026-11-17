// src/app/api/auth/session/route.ts
// Route Handler GET /api/auth/session
// Consulta el estado de sesión del usuario: 200 { authenticated: true, user }
// con datos públicos (id, name, email) si hay sesión válida; 401 UNAUTHORIZED
// en caso contrario. El token de sesión nunca se devuelve en el body.

import { NextResponse } from "next/server";
import { ok, fail } from "../../../../lib/api-response";
import { getSessionUserId } from "../../../../lib/session";
import { prisma } from "../../../../services/auth-service";

export async function GET(request: Request): Promise<Response> {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      fail("UNAUTHORIZED", "No hay una sesión activa"),
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  // La sesión existe pero el usuario ya no (p. ej. borrado en cascada): 401.
  if (!user) {
    return NextResponse.json(
      fail("UNAUTHORIZED", "No hay una sesión activa"),
      { status: 401 },
    );
  }

  return NextResponse.json(ok({ authenticated: true, user }), { status: 200 });
}
