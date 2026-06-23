import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { PipelineStage, Prisma } from "@/generated/prisma";
import type { CreateOpportunityInput, UpdateOpportunityInput } from "@/lib/validators/opportunity-schema";

const TERMINAL_STAGES: PipelineStage[] = [
  PipelineStage.Rejected,
  PipelineStage.Completed,
];

const PAYMENT_ACTIVE_STAGES: PipelineStage[] = [
  PipelineStage.ProposalSent,
  PipelineStage.Negotiation,
  PipelineStage.Accepted,
  PipelineStage.InDevelopment,
  PipelineStage.Completed,
];

const DEVELOPMENT_ACTIVE_STAGES: PipelineStage[] = [
  PipelineStage.Accepted,
  PipelineStage.InDevelopment,
  PipelineStage.Completed,
];

/** Registra un cambio de etapa inicial para que la analítica del pipeline pueda calcular la duración media incluso para oportunidades que nunca se han movido. */
export async function createOpportunity(userId: string, input: CreateOpportunityInput) {
  const opportunity = await prisma.opportunity.create({
    data: {
      userId,
      clientName: input.clientName,
      description: input.description,
      estimatedBudget: input.estimatedBudget,
      contactPersonName: input.contactPersonName,
      contactChannel: input.contactChannel,
    },
  });

  await prisma.stageChange.create({
    data: {
      opportunityId: opportunity.id,
      fromStage: PipelineStage.Lead,
      toStage: PipelineStage.Lead,
    },
  });

  logger.info({ opportunityId: opportunity.id }, "Opportunity created");
  return opportunity;
}

/** Excluye registros archivados para que el tablero kanban nunca muestre entradas obsoletas/eliminadas, e incluye eager loading de la última nota para que la tarjeta pueda renderizar un snippet de contexto sin N+1. */
export async function getOpportunitiesByUser(userId: string, filters?: {
  pipelineStage?: PipelineStage;
  contactChannel?: string;
  paymentStatus?: string;
  developmentStatus?: string;
  search?: string;
}) {
  const where: Prisma.OpportunityWhereInput = {
    userId,
    isArchived: false,
  };

  if (filters?.pipelineStage) where.pipelineStage = filters.pipelineStage;
  if (filters?.contactChannel) where.contactChannel = filters.contactChannel as any;
  if (filters?.paymentStatus) where.paymentStatus = filters.paymentStatus as any;
  if (filters?.developmentStatus) where.developmentStatus = filters.developmentStatus as any;
  if (filters?.search) {
    where.OR = [
      { clientName: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.opportunity.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { notes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
}

export async function getOpportunityById(id: string, userId: string) {
  return prisma.opportunity.findFirst({
    where: { id, userId },
    include: {
      notes: { orderBy: { createdAt: "asc" } },
      stageChanges: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** Aplica la invariante de etapa terminal (Rechazado/Completado no pueden abandonarse, lo que distorsionaría las métricas del embudo) y auto-activa los estados de pago/desarrollo al moverse a etapas que exponen esos campos, ahorrando al usuario un clic extra. */
export async function updateOpportunity(
  id: string,
  userId: string,
  input: UpdateOpportunityInput,
) {
  const existing = await prisma.opportunity.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error("Opportunity not found");

  if (
    TERMINAL_STAGES.includes(existing.pipelineStage) &&
    input.pipelineStage &&
    input.pipelineStage !== existing.pipelineStage
  ) {
    throw new Error("Cannot move from a terminal stage");
  }

  const data: Prisma.OpportunityUpdateInput = { ...input };

  if (input.pipelineStage && input.pipelineStage !== existing.pipelineStage) {
    await prisma.stageChange.create({
      data: {
        opportunityId: id,
        fromStage: existing.pipelineStage,
        toStage: input.pipelineStage,
      },
    });

    if (PAYMENT_ACTIVE_STAGES.includes(input.pipelineStage) && !existing.paymentStatus) {
      data.paymentStatus = "Quoted";
    }

    if (DEVELOPMENT_ACTIVE_STAGES.includes(input.pipelineStage) && !existing.developmentStatus) {
      data.developmentStatus = "Pending";
    }
  }

  const updated = await prisma.opportunity.update({
    where: { id },
    data,
  });

  logger.info({ opportunityId: id, stage: updated.pipelineStage }, "Opportunity updated");
  return updated;
}

export async function deleteOpportunity(id: string, userId: string) {
  const existing = await prisma.opportunity.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new Error("Opportunity not found");

  await prisma.opportunity.delete({ where: { id } });
  logger.info({ opportunityId: id }, "Opportunity deleted");
}

export async function archiveOpportunity(id: string, userId: string) {
  const existing = await prisma.opportunity.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new Error("Opportunity not found");

  return prisma.opportunity.update({
    where: { id },
    data: { isArchived: true },
  });
}

export async function restoreOpportunity(id: string, userId: string) {
  const existing = await prisma.opportunity.findFirst({
    where: { id, userId, isArchived: true },
  });
  if (!existing) throw new Error("Archived opportunity not found");

  return prisma.opportunity.update({
    where: { id },
    data: { isArchived: false },
  });
}

export async function getArchivedOpportunities(userId: string, search?: string) {
  const where: Prisma.OpportunityWhereInput = {
    userId,
    isArchived: true,
  };

  if (search) {
    where.OR = [
      { clientName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.opportunity.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}
