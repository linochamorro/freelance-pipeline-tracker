// src/services/session-service.ts
// Servicio de sesión: creación, eliminación y validación de filas Session.
// Token criptográfico de 32 bytes en base64url (43 caracteres), expiración a 30 días.
// Nota: se usa "node:crypto" (no "crypto") porque el empaquetador de pruebas
// (jsdom) externaliza el especificador bare para navegador y rompería randomBytes.
// Patrón: instancia compartida de PrismaClient (igual que auth-service.ts).

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

export const prisma = new PrismaClient();

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

export interface CreatedSession {
  sessionToken: string;
  expires: Date;
}

/**
 * Crea una sesión persistente para el usuario indicado.
 * Genera un token criptográficamente seguro (32 bytes → base64url)
 * y lo persiste en la tabla Session con expiración a 30 días.
 */
export async function createSession(userId: string): Promise<CreatedSession> {
  const sessionToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return { sessionToken, expires };
}

/**
 * Elimina la sesión por token. Idempotente: no falla si el token no existe.
 */
export async function deleteSession(sessionToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { sessionToken },
  });
}

/**
 * Valida un token de sesión y devuelve el userId asociado,
 * o null si la sesión no existe o ya expiró.
 */
export async function validateSession(token: string): Promise<string | null> {
  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    select: { userId: true, expires: true },
  });

  if (!session || session.expires < new Date()) return null;
  return session.userId;
}
