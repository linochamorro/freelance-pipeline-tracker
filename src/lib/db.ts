import { PrismaClient } from "@prisma/client";

/** En desarrollo, Next.js recarga los módulos en cada hot-reload sin limpiar la referencia global; sin esta cache, cada recarga crearía una nueva instancia de PrismaClient que agotaría las conexiones a la base de datos. */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
