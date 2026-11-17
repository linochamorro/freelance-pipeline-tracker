// src/services/auth-service.ts
// Servicio de autenticación: registro de usuario con hash bcrypt de la contraseña.
// Dependencia: bcryptjs (ya en dependencias del proyecto).
// Patrón: instancia compartida de PrismaClient (igual que task-service.ts).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { User } from "@/types";

export const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

/**
 * Hash centinela de coste 12 (fijo, público y no secreto) usado como segundo
 * argumento de `bcrypt.compare` en las vías de login «usuario inexistente» y
 * «usuario existente sin hash válido». Garantiza que las tres vías ejecutan
 * trabajo KDF real de coste 12 (equivalencia de tiempo, ADR-006) sin derivar
 * el valor de credenciales reales. No es un secreto: es un hash bcrypt válido
 * de una cadena fija cualquiera, insuficiente por sí solo para autenticarse.
 */
export const LOGIN_SENTINEL_HASH =
  "$2b$12$IZUNM3FOkOv9BSDTY1D.GudSmwQaoclNe./b0Y9ntxBZDi0Z8IRl2";

/** Hash bcrypt válido de coste 12 (prefijo $2a/$2b/$2y$12$, 60 caracteres). */
export function isValidCost12BcryptHash(value: string | null | undefined): boolean {
  return (
    typeof value === "string" &&
    value.length === 60 &&
    /^\$2[aby]\$12\$/.test(value)
  );
}

export interface RegisterData {
  name?: string | null;
  email: string;
  password: string;
}

/**
 * Registra un nuevo usuario hasheando su contraseña con bcrypt.
 * Lanza error si el email ya existe (restricción @unique de Prisma).
 */
export async function registerUser(data: RegisterData): Promise<User> {
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  return prisma.user.create({
    data: {
      name: data.name ?? null,
      email: data.email,
      passwordHash,
    },
  });
}
