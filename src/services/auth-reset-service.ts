// src/services/auth-reset-service.ts
// Servicio de restablecimiento de contraseña: generación de token criptográfico,
// persistencia en VerificationToken, uso único y respuesta no enumeradora (ADR-006).
// Mitigación de timing attacks: retardo uniforme independientemente de si el email existe.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora
const UNIFORM_DELAY_MS = 100; // retardo uniforme para mitigación de timing attacks

export interface RequestResetResult {
  message: string;
  /** Token de restablecimiento, presente solo cuando el usuario existe.
   * Se expone internamente para que el Route Handler envíe el correo (F04-T02).
   * Nunca se devuelve en la respuesta HTTP (ADR-006: no enumeración). */
  token?: string;
}

const NON_ENUMERATING_MESSAGE =
  "Si el correo está registrado, recibirás un enlace de restablecimiento";

function uniformDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Solicita restablecimiento de contraseña.
 * Responde idénticamente (200 OK, mismo mensaje) para emails existentes e inexistentes.
 * ADR-006: no enumeración de emails + mitigación de timing attacks.
 */
export async function requestPasswordReset(
  email: string,
): Promise<RequestResetResult> {
  // Buscar usuario (puede no existir). Siempre se ejecuta esta consulta.
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Generar token criptográficamente seguro: 32 bytes → base64url
    const token = crypto.randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    // Persistir en VerificationToken (token de uso único, se invalida tras consumo)
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });
    // El envío del correo se implementa en F04-T02 (Route Handler + email adapter).
    // Se retorna el token para que el Route Handler lo envíe por correo.
    // Retardo uniforme también en esta vía: el tiempo de respuesta debe ser
    // equiparable exista o no el email (ADR-006, prueba permanente de F04).
    await uniformDelay(UNIFORM_DELAY_MS);
    return { message: NON_ENUMERATING_MESSAGE, token };
  }

  // Retardo uniforme para que el tiempo de respuesta sea equiparable
  // independientemente de si el email existe o no (mitigación timing attacks).
  await uniformDelay(UNIFORM_DELAY_MS);

  return { message: NON_ENUMERATING_MESSAGE };
}

/**
 * H-3 (F05-T01 loop 2/3): consumo atómico del token de restablecimiento.
 *
 * Reclamo atómico de la fila de VerificationToken (deleteMany con conteo==1,
 * sin columnas nuevas) en UNA única transacción y UNA única instancia de
 * PrismaClient (la exportada por este módulo). Reclamo, actualización de
 * contraseña e invalidación de todas las sesiones del usuario ocurren juntos.
 *
 * - El token se consume también cuando no existe usuario (sin mutar contraseña).
 * - Tras un cambio efectivo, todas las sesiones del usuario quedan invalidadas.
 * - No se lanza excepción por token inexistente/expirado/reusado/sin usuario;
 *   la ruta mantiene la respuesta 200 fija para cualquier token (ADR-006).
 */
export async function consumePasswordResetToken(
  token: string,
  newPassword: string,
): Promise<void> {
  const now = new Date();
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    // Leer dentro de la transacción para conocer el identificador (email)
    // antes del reclamo. La validez se verifica de nuevo en el claim atómico.
    const tokenRow = await tx.verificationToken.findUnique({
      where: { token },
      select: { identifier: true, expires: true },
    });

    if (!tokenRow || tokenRow.expires <= now) {
      return;
    }

    // Reclamo atómico: solo quien afecta exactamente una fila puede continuar.
    const claimed = await tx.verificationToken.deleteMany({
      where: { token, expires: { gt: now } },
    });

    if (claimed.count !== 1) {
      // Carrera perdida: otra petición reclamó el token. Sin mutaciones.
      return;
    }

    const user = await tx.user.findUnique({
      where: { email: tokenRow.identifier },
      select: { id: true },
    });

    if (!user) {
      // Token consumido también sin usuario (ADR-006, sin mutar contraseña).
      return;
    }

    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidación de todas las sesiones previas del usuario.
    await tx.session.deleteMany({
      where: { userId: user.id },
    });
  });
}
