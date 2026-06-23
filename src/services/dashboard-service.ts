import { prisma } from "@/lib/db";
import { PipelineStage } from "@/generated/prisma";

const ACTIVE_STAGES: PipelineStage[] = [
  PipelineStage.Lead,
  PipelineStage.Contacted,
  PipelineStage.InDiscussion,
  PipelineStage.ProposalSent,
  PipelineStage.Negotiation,
  PipelineStage.Accepted,
  PipelineStage.OnHold,
  PipelineStage.InDevelopment,
];

/** Deriva la salud del pipeline desde una única carga de datos para evitar N+1: tasa de conversión (lead → aceptado), días promedio por etapa a partir de los timestamps de cambios de etapa, y conteo de oportunidades estancadas usando un umbral predeterminado de 7 días. */
export async function getDashboardMetrics(userId: string) {
  const allOpportunities = await prisma.opportunity.findMany({
    where: { userId, isArchived: false },
    select: {
      id: true,
      pipelineStage: true,
      estimatedBudget: true,
      updatedAt: true,
      createdAt: true,
      stageChanges: {
        select: { fromStage: true, toStage: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const totalActive = allOpportunities.filter((o) =>
    ACTIVE_STAGES.includes(o.pipelineStage),
  ).length;

  const totalPipelineValue = allOpportunities
    .filter((o) => ACTIVE_STAGES.includes(o.pipelineStage))
    .reduce((sum, o) => sum + o.estimatedBudget, 0);

  const leadCount = allOpportunities.filter(
    (o) => o.pipelineStage === PipelineStage.Lead,
  ).length;
  const acceptedCount = allOpportunities.filter(
    (o) => o.pipelineStage === PipelineStage.Accepted,
  ).length;
  const conversionRate =
    leadCount > 0 ? (acceptedCount / leadCount) * 100 : 0;

  const stageDurations: Record<string, number[]> = {};
  for (const stage of ACTIVE_STAGES) {
    stageDurations[stage] = [];
  }

  for (const opp of allOpportunities) {
    for (const change of opp.stageChanges) {
      if (!stageDurations[change.fromStage]) continue;
      const nextChange = opp.stageChanges.find(
        (sc) =>
          sc.createdAt > change.createdAt &&
          sc.fromStage === change.fromStage,
      );
      if (nextChange) {
        const duration =
          (nextChange.createdAt.getTime() - change.createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
        stageDurations[change.fromStage].push(duration);
      }
    }
  }

  const avgDaysPerStage: Record<string, number> = {};
  for (const [stage, durations] of Object.entries(stageDurations)) {
    avgDaysPerStage[stage] =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
  }

  const stalenessThreshold = 7;
  const staleCount = allOpportunities.filter((o) => {
    const daysSinceUpdate =
      (Date.now() - o.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > stalenessThreshold;
  }).length;

  return {
    totalActive,
    totalPipelineValue,
    conversionRate: Math.round(conversionRate * 100) / 100,
    avgDaysPerStage,
    staleCount,
  };
}
