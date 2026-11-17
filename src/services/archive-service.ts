// src/services/archive-service.ts
// Servicio de dominio para el archivo y restitución de oportunidades (deals).
// Preserva la etapa original del deal al archivar y desarchivar, con estricto aislamiento por userId (IDOR).

import { PrismaClient } from "@prisma/client";
import type { Opportunity } from "@/types";

export const prisma = new PrismaClient();

export async function archiveOpportunity(
  opportunityId: string,
  userId: string,
): Promise<Opportunity> {
  const existing = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Oportunidad no encontrada o acceso denegado");
  }

  return prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      isArchived: true,
    },
  });
}

export async function unarchiveOpportunity(
  opportunityId: string,
  userId: string,
): Promise<Opportunity> {
  const existing = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Oportunidad no encontrada o acceso denegado");
  }

  return prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      isArchived: false,
    },
  });
}

export async function listArchivedOpportunities(
  userId: string,
): Promise<Opportunity[]> {
  return prisma.opportunity.findMany({
    where: {
      userId,
      isArchived: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}
