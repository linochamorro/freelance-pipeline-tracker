// src/services/dashboard-service.ts
// Servicio de métricas del dashboard general.
// Calcula valor del pipeline, tasa de conversión y deals activos.
// Filtra oportunidades inactivas (stale) honrando los umbrales de UserSettings
// del usuario autenticado (ADR-003). Valor dinámico al cambiar umbrales.
// Mapeo de etapas a campos de umbral: Lead/Contacted → prospection,
// MeetingScheduled/BriefReceived/ProposalSent/Negotiation → proposal,
// Accepted/InProgress → execution, Completed/Rejected → closed.

import { PrismaClient } from "@prisma/client";
import {
  defaultStalenessThresholds,
  getStalenessDaysForStage,
  calculateStalenessDeadline,
  isStale,
  type StalenessThresholds,
} from "../lib/rules/staleness";
import type { PipelineStage, Opportunity } from "@/types";

export const prisma = new PrismaClient();

export interface StaleDeal {
  id: string;
  clientName: string;
  pipelineStage: PipelineStage;
  updatedAt: Date;
  daysOverdue: number;
}

export interface DashboardMetrics {
  pipelineValue: number;
  conversionRate: number;
  activeDeals: number;
  staleDeals: StaleDeal[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Obtiene las métricas del dashboard para un usuario.
 * @param userId - ID del usuario autenticado.
 * @param thresholds - Umbrales de inactividad opcionales. Si no se proporcionan,
 *   se usan los valores por defecto de inicialización (7 días por campo).
 * @param referenceDate - Fecha de referencia para cálculo de staleness (default = ahora).
 */
export async function getDashboardMetrics(
  userId: string,
  thresholds?: StalenessThresholds,
  referenceDate: Date = new Date(),
): Promise<DashboardMetrics> {
  const opportunities = await prisma.opportunity.findMany({
    where: { userId, isArchived: false },
  });

  const effectiveThresholds = thresholds ?? defaultStalenessThresholds();

  // Valor del pipeline: suma de estimatedBudget de oportunidades no archivadas
  const pipelineValue = opportunities.reduce(
    (sum, opp) => sum + (opp.estimatedBudget ?? 0),
    0,
  );

  // Deals activos: oportunidades no terminales (no Completed ni Rejected)
  const activeDeals = opportunities.filter(
    (opp) => opp.pipelineStage !== "Completed" && opp.pipelineStage !== "Rejected",
  ).length;

  // Tasa de conversión: completados / (completados + rechazados) * 100
  const completed = opportunities.filter(
    (opp) => opp.pipelineStage === "Completed",
  ).length;
  const rejected = opportunities.filter(
    (opp) => opp.pipelineStage === "Rejected",
  ).length;
  const terminal = completed + rejected;
  const conversionRate = terminal > 0 ? (completed / terminal) * 100 : 0;

  // Oportunidades inactivas (stale) según umbrales del usuario
  const staleDeals: StaleDeal[] = opportunities
    .filter((opp) =>
      isStale(opp.updatedAt, opp.pipelineStage, effectiveThresholds, referenceDate),
    )
    .map((opp): StaleDeal => {
      const days = getStalenessDaysForStage(
        opp.pipelineStage,
        effectiveThresholds,
      );
      const deadline = calculateStalenessDeadline(
        opp.updatedAt,
        opp.pipelineStage,
        effectiveThresholds,
      );
      const daysOverdue = Math.max(
        0,
        Math.ceil((referenceDate.getTime() - deadline.getTime()) / MS_PER_DAY),
      );
      return {
        id: opp.id,
        clientName: opp.clientName,
        pipelineStage: opp.pipelineStage,
        updatedAt: opp.updatedAt,
        daysOverdue,
      };
    });

  return {
    pipelineValue,
    conversionRate,
    activeDeals,
    staleDeals,
  };
}
