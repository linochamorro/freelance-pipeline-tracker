// src/lib/session.ts
// Resuelve el userId de la sesión activa a partir de la cookie de sesión.
// Utilizado por los Route Handlers que requieren autenticación (/api/dashboard, /api/settings).
// No expone secretos ni valores de entorno.

import { cookies } from "next/headers";
import { prisma } from "../services/auth-service";

const SESSION_COOKIE_NAME = "sessionToken";

/**
 * Devuelve el userId de la sesión activa o null si no hay sesión válida.
 * Valida el token de sesión contra el modelo Session y su expiración.
 */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    select: { userId: true, expires: true },
  });

  if (!session || session.expires < new Date()) return null;
  return session.userId;
}
