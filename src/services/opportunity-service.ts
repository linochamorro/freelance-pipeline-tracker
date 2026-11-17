// src/services/opportunity-service.ts
// Servicio de dominio para gestión del pipeline comercial y ciclo de vida de oportunidades.
// Cumple con reglas de transición de etapas, activación de subestados y aislamiento estricto por userId (IDOR).

import { PrismaClient } from "@prisma/client";
import type {
  Opportunity,
  PipelineStage,
  PaymentStatus,
  DevelopmentStatus,
  ContactChannel,
} from "@/types";
import {
  canTransition,
  isOnHoldStage,
  isValidStage,
  isTerminalStage,
} from "../lib/rules/stage-transitions";
import {
  canActivateDevelopmentStatus,
  canActivatePaymentStatus,
} from "../lib/rules/substate-activation";
import { isValidContactChannel } from "../lib/rules/contact-channels";

export const prisma = new PrismaClient();

export interface OpportunityCreateData {
  userId: string;
  clientName: string;
  description: string;
  estimatedBudget: number;
  contactPersonName: string;
  contactChannel: ContactChannel;
  pipelineStage?: PipelineStage;
  paymentStatus?: PaymentStatus | null;
  developmentStatus?: DevelopmentStatus | null;
}

export interface OpportunityUpdateData {
  clientName?: string;
  description?: string;
  estimatedBudget?: number;
  contactPersonName?: string;
  contactChannel?: ContactChannel;
  pipelineStage?: PipelineStage;
  developmentStatus?: DevelopmentStatus | null;
  paymentStatus?: PaymentStatus | null;
  observation?: string;
}

export interface OpportunityListFilters {
  stage?: PipelineStage;
  isArchived?: boolean;
}

export async function createOpportunity(
  data: OpportunityCreateData,
): Promise<Opportunity> {
  if (!data.userId || !data.userId.trim()) {
    throw new Error("userId es requerido");
  }
  if (!data.clientName || !data.clientName.trim()) {
    throw new Error("clientName es requerido y no puede estar vacío");
  }
  if (!data.description || !data.description.trim()) {
    throw new Error("description es requerida y no puede estar vacía");
  }
  if (!data.contactPersonName || !data.contactPersonName.trim()) {
    throw new Error("contactPersonName es requerido y no puede estar vacío");
  }
  if (typeof data.estimatedBudget !== "number" || data.estimatedBudget < 0 || isNaN(data.estimatedBudget)) {
    throw new Error("estimatedBudget debe ser un número mayor o igual a 0");
  }
  if (!isValidContactChannel(data.contactChannel)) {
    throw new Error(`Canal de contacto inválido: ${data.contactChannel}`);
  }

  const stage: PipelineStage = data.pipelineStage ?? "Lead";

  if (!isValidStage(stage)) {
    throw new Error(`Etapa de pipeline inválida: ${stage}`);
  }
  if (isOnHoldStage(stage)) {
    throw new Error("La etapa 'On Hold' no está permitida en el pipeline comercial");
  }
  if (data.pipelineStage && isTerminalStage(stage)) {
    throw new Error(`No se puede crear una oportunidad directamente en una etapa terminal (${stage})`);
  }

  if (data.developmentStatus) {
    if (!canActivateDevelopmentStatus(stage, data.developmentStatus)) {
      throw new Error(
        `No se puede activar el estado de desarrollo ${data.developmentStatus} en la etapa ${stage}`,
      );
    }
  }

  if (data.paymentStatus) {
    if (!canActivatePaymentStatus(stage, data.paymentStatus)) {
      throw new Error(
        `No se puede activar el estado de pago ${data.paymentStatus} en la etapa ${stage}`,
      );
    }
  }

  return prisma.opportunity.create({
    data: {
      userId: data.userId,
      clientName: data.clientName.trim(),
      description: data.description.trim(),
      estimatedBudget: data.estimatedBudget,
      contactPersonName: data.contactPersonName.trim(),
      contactChannel: data.contactChannel,
      pipelineStage: stage,
      paymentStatus: data.paymentStatus ?? null,
      developmentStatus: data.developmentStatus ?? null,
      isArchived: false,
    },
  });
}

export async function getOpportunityById(
  id: string,
  userId: string,
): Promise<Opportunity> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
  });

  if (!opportunity || opportunity.userId !== userId) {
    throw new Error("Oportunidad no encontrada o acceso no autorizado");
  }

  return opportunity;
}

export async function listOpportunities(
  userId: string,
  filters?: OpportunityListFilters,
): Promise<Opportunity[]> {
  const whereClause: {
    userId: string;
    isArchived: boolean;
    pipelineStage?: PipelineStage;
  } = {
    userId,
    isArchived: filters?.isArchived ?? false,
  };

  if (filters?.stage) {
    whereClause.pipelineStage = filters.stage;
  }

  return prisma.opportunity.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });
}

export async function updateOpportunity(
  id: string,
  userId: string,
  data: OpportunityUpdateData,
): Promise<Opportunity> {
  const existing = await prisma.opportunity.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Oportunidad no encontrada o acceso no autorizado");
  }

  const stageChanged =
    data.pipelineStage !== undefined && data.pipelineStage !== existing.pipelineStage;

  if (stageChanged) {
    const newStage = data.pipelineStage as string;
    if (isOnHoldStage(newStage)) {
      throw new Error("La etapa 'On Hold' no está permitida en el pipeline comercial");
    }
    if (!isValidStage(newStage)) {
      throw new Error(`Etapa de pipeline inválida: ${newStage}`);
    }
    if (!canTransition(existing.pipelineStage, newStage)) {
      throw new Error(
        `Transición inválida de ${existing.pipelineStage} a ${newStage}`,
      );
    }
  }

  const effectiveStage = data.pipelineStage ?? existing.pipelineStage;

  const devStatusChanged =
    data.developmentStatus !== undefined &&
    data.developmentStatus !== existing.developmentStatus;

  if (
    devStatusChanged &&
    data.developmentStatus !== null &&
    data.developmentStatus !== undefined
  ) {
    if (!canActivateDevelopmentStatus(effectiveStage, data.developmentStatus)) {
      throw new Error(
        `No se puede activar el estado de desarrollo ${data.developmentStatus} en la etapa ${effectiveStage}`,
      );
    }
  }

  const paymentStatusChanged =
    data.paymentStatus !== undefined &&
    data.paymentStatus !== existing.paymentStatus;

  if (
    paymentStatusChanged &&
    data.paymentStatus !== null &&
    data.paymentStatus !== undefined
  ) {
    if (!canActivatePaymentStatus(effectiveStage, data.paymentStatus)) {
      throw new Error(
        `No se puede activar el estado de pago ${data.paymentStatus} en la etapa ${effectiveStage}`,
      );
    }
  }

  if (data.contactChannel !== undefined && !isValidContactChannel(data.contactChannel)) {
    throw new Error(`Canal de contacto inválido: ${data.contactChannel}`);
  }

  if (data.estimatedBudget !== undefined && (data.estimatedBudget < 0 || isNaN(data.estimatedBudget))) {
    throw new Error("estimatedBudget debe ser un número mayor o igual a 0");
  }

  return prisma.$transaction(async (tx) => {
    if (stageChanged) {
      await tx.stageChange.create({
        data: {
          opportunityId: id,
          fromStage: existing.pipelineStage,
          toStage: data.pipelineStage!,
        },
      });

      await tx.subStateChange.create({
        data: {
          opportunityId: id,
          field: "pipelineStage",
          fromValue: existing.pipelineStage,
          toValue: data.pipelineStage!,
          observation: data.observation ?? undefined,
        },
      });
    }

    if (devStatusChanged) {
      await tx.subStateChange.create({
        data: {
          opportunityId: id,
          field: "developmentStatus",
          fromValue: existing.developmentStatus ?? "None",
          toValue: data.developmentStatus ?? "None",
          observation: data.observation ?? undefined,
        },
      });
    }

    if (paymentStatusChanged) {
      await tx.subStateChange.create({
        data: {
          opportunityId: id,
          field: "paymentStatus",
          fromValue: existing.paymentStatus ?? "None",
          toValue: data.paymentStatus ?? "None",
          observation: data.observation ?? undefined,
        },
      });
    }

    return tx.opportunity.update({
      where: { id },
      data: {
        clientName: data.clientName?.trim() ?? undefined,
        description: data.description?.trim() ?? undefined,
        estimatedBudget: data.estimatedBudget !== undefined ? data.estimatedBudget : undefined,
        contactPersonName: data.contactPersonName?.trim() ?? undefined,
        contactChannel: data.contactChannel ?? undefined,
        pipelineStage: data.pipelineStage ?? undefined,
        developmentStatus:
          data.developmentStatus !== undefined ? data.developmentStatus : undefined,
        paymentStatus:
          data.paymentStatus !== undefined ? data.paymentStatus : undefined,
      },
    });
  });
}

export async function deleteOpportunity(
  id: string,
  userId: string,
): Promise<Opportunity> {
  const existing = await prisma.opportunity.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Oportunidad no encontrada o acceso no autorizado");
  }

  return prisma.opportunity.delete({
    where: { id },
  });
}
