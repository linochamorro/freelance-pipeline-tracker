import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { RegisterInput } from "@/lib/validators/auth-schema";

/** Evita colisiones de emails duplicados con un error claro en lugar de un fallo de restricción de Prisma, y aplica hash con 12 rondas para que el hash resultante nunca se almacene o registre en texto plano. */
export async function createUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    logger.warn({ email: input.email }, "Registration attempt with existing email");
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
  });

  logger.info({ userId: user.id }, "User created successfully");

  return { id: user.id, name: user.name, email: user.email };
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}
