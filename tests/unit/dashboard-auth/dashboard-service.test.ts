import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock de PrismaClient antes de importar el servicio
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    opportunity: {
      findMany: vi.fn(),
    },
  })),
}));

import { prisma } from "../../../src/services/dashboard-service";
import { getDashboardMetrics } from "../../../src/services/dashboard-service";

// Umbrales de prueba personalizados
const customThresholds = {
  prospectionStalenessDays: 3,
  proposalStalenessDays: 5,
  executionStalenessDays: 2,
  billingStalenessDays: 10,
  closedStalenessDays: 30,
};

const now = new Date("2026-11-12T10:00:00Z");

// Solo oportunidades NO archivadas (como las devolvería Prisma con isArchived: false)
const opportunities = [
  {
    id: "opp1",
    userId: "user1",
    clientName: "Acme Corp",
    estimatedBudget: 5000,
    pipelineStage: "Lead" as const,
    isArchived: false,
    updatedAt: new Date("2026-11-10T10:00:00Z"), // 2 días atrás → umbral 3 → no stale
    createdAt: new Date("2026-11-01T10:00:00Z"),
  },
  {
    id: "opp2",
    userId: "user1",
    clientName: "Globex",
    estimatedBudget: 8000,
    pipelineStage: "ProposalSent" as const,
    isArchived: false,
    updatedAt: new Date("2026-11-05T10:00:00Z"), // 7 días atrás → umbral 5 → stale
    createdAt: new Date("2026-11-01T10:00:00Z"),
  },
  {
    id: "opp3",
    userId: "user1",
    clientName: "Initech",
    estimatedBudget: 3000,
    pipelineStage: "Completed" as const,
    isArchived: false,
    updatedAt: new Date("2026-11-11T10:00:00Z"),
    createdAt: new Date("2026-11-01T10:00:00Z"),
  },
  {
    id: "opp4",
    userId: "user1",
    clientName: "Hooli",
    estimatedBudget: 12000,
    pipelineStage: "Rejected" as const,
    isArchived: false,
    updatedAt: new Date("2026-11-11T10:00:00Z"),
    createdAt: new Date("2026-11-01T10:00:00Z"),
  },
];

describe("dashboard-service — métricas del pipeline (F04-T01, ADR-003)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Usar fecha fija para tests deterministas de staleness
    vi.spyOn(Date, "now").mockReturnValue(now.getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("debe calcular valor del pipeline sumando estimatedBudget de no archivados", async () => {
    (prisma.opportunity.findMany as any).mockResolvedValue(opportunities);

    const result = await getDashboardMetrics("user1", customThresholds);

    expect(result.pipelineValue).toBe(5000 + 8000 + 3000 + 12000); // 28000
  });

  it("debe calcular tasa de conversión (completados / terminales * 100)", async () => {
    (prisma.opportunity.findMany as any).mockResolvedValue(opportunities);

    const result = await getDashboardMetrics("user1", customThresholds);

    // 1 completado, 1 rechazado → terminales = 2, conversión = 50%
    expect(result.conversionRate).toBe(50);
  });

  it("debe contar deals activos (no terminales, no archivados)", async () => {
    (prisma.opportunity.findMany as any).mockResolvedValue(opportunities);

    const result = await getDashboardMetrics("user1", customThresholds);

    // opp1 (Lead) y opp2 (ProposalSent) son activos → 2
    expect(result.activeDeals).toBe(2);
  });

  it("debe filtrar oportunidades inactivas (stale) según umbrales del usuario", async () => {
    (prisma.opportunity.findMany as any).mockResolvedValue(opportunities);

    const result = await getDashboardMetrics("user1", customThresholds, now);

    // opp2: ProposalSent, updatedAt 2026-11-05, umbral 5 días → límite 2026-11-10
    // referenceDate 2026-11-12 > 2026-11-10 → stale ✓
    // opp1: Lead, updatedAt 2026-11-10, umbral 3 días → límite 2026-11-13
    // referenceDate 2026-11-12 < 2026-11-13 → no stale
    expect(result.staleDeals.length).toBe(1);
    expect(result.staleDeals[0].id).toBe("opp2");
    expect(result.staleDeals[0].clientName).toBe("Globex");
  });

  it("debe usar umbrales por defecto (7 días) cuando no se proporcionan", async () => {
    (prisma.opportunity.findMany as any).mockResolvedValue(opportunities);

    const result = await getDashboardMetrics("user1", undefined, now);

    // Con umbral 7 días para Lead: opp1 updatedAt 2026-11-10 + 7 = 2026-11-17
    // referenceDate 2026-11-12 < 2026-11-17 → no stale
    // opp2: ProposalSent, umbral 7: 2026-11-05 + 7 = 2026-11-12
    // referenceDate 2026-11-12 == 2026-11-12 → no stale (no supera, estricto >)
    expect(result.staleDeals.length).toBe(0);
  });

  it("debe cambiar dinámicamente el resultado al modificar los umbrales", async () => {
    (prisma.opportunity.findMany as any).mockResolvedValue(opportunities);

    // Umbral muy bajo → todo está stale
    const lowThresholds = {
      prospectionStalenessDays: 0,
      proposalStalenessDays: 0,
      executionStalenessDays: 0,
      billingStalenessDays: 0,
      closedStalenessDays: 0,
    };
    const resultLow = await getDashboardMetrics("user1", lowThresholds, now);
    expect(resultLow.staleDeals.length).toBeGreaterThan(0);

    // Umbral muy alto → nada está stale
    const highThresholds = {
      prospectionStalenessDays: 365,
      proposalStalenessDays: 365,
      executionStalenessDays: 365,
      billingStalenessDays: 365,
      closedStalenessDays: 365,
    };
    const resultHigh = await getDashboardMetrics("user1", highThresholds, now);
    expect(resultHigh.staleDeals.length).toBe(0);
  });

  it("debe mapear etapas correctamente a campos de umbral (prospection/proposal/execution/closed)", async () => {
    // Oportunidades con updatedAt hace 3 días (supera umbral de execution = 2 días)
    const threeDaysAgo = new Date("2026-11-09T10:00:00Z");
    const mappedOpportunities = [
      { id: "m1", clientName: "A", estimatedBudget: 1000, pipelineStage: "Lead" as const, updatedAt: threeDaysAgo, isArchived: false, userId: "user1", createdAt: new Date() },
      { id: "m2", clientName: "B", estimatedBudget: 1000, pipelineStage: "Contacted" as const, updatedAt: threeDaysAgo, isArchived: false, userId: "user1", createdAt: new Date() },
      { id: "m3", clientName: "C", estimatedBudget: 1000, pipelineStage: "MeetingScheduled" as const, updatedAt: threeDaysAgo, isArchived: false, userId: "user1", createdAt: new Date() },
      { id: "m4", clientName: "D", estimatedBudget: 1000, pipelineStage: "ProposalSent" as const, updatedAt: threeDaysAgo, isArchived: false, userId: "user1", createdAt: new Date() },
      { id: "m5", clientName: "E", estimatedBudget: 1000, pipelineStage: "Negotiation" as const, updatedAt: threeDaysAgo, isArchived: false, userId: "user1", createdAt: new Date() },
      { id: "m6", clientName: "F", estimatedBudget: 1000, pipelineStage: "Accepted" as const, updatedAt: threeDaysAgo, isArchived: false, userId: "user1", createdAt: new Date() },
      { id: "m7", clientName: "G", estimatedBudget: 1000, pipelineStage: "InProgress" as const, updatedAt: threeDaysAgo, isArchived: false, userId: "user1", createdAt: new Date() },
      { id: "m8", clientName: "H", estimatedBudget: 1000, pipelineStage: "Completed" as const, updatedAt: threeDaysAgo, isArchived: false, userId: "user1", createdAt: new Date() },
      { id: "m9", clientName: "I", estimatedBudget: 1000, pipelineStage: "Rejected" as const, updatedAt: threeDaysAgo, isArchived: false, userId: "user1", createdAt: new Date() },
    ];
    (prisma.opportunity.findMany as any).mockResolvedValue(mappedOpportunities);

    const result = await getDashboardMetrics("user1", customThresholds, now);

    // Con referenceDate ahora (2026-11-12) y updatedAt hace 3 días (2026-11-09):
    // prospection umbral 3 → límite 2026-11-12 → referenceDate == límite → no stale (estricto >)
    // proposal umbral 5 → no stale
    // execution umbral 2 → límite 2026-11-11 → referenceDate > límite → stale ✓
    // closed umbral 30 → no stale
    const executionStales = result.staleDeals.filter(
      (d) => d.pipelineStage === "Accepted" || d.pipelineStage === "InProgress",
    );
    expect(executionStales.length).toBe(2);
  });

  it("debe filtrar por userId en la consulta de Prisma", async () => {
    (prisma.opportunity.findMany as any).mockResolvedValue([]);

    await getDashboardMetrics("user-42", customThresholds, now);

    expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
      where: { userId: "user-42", isArchived: false },
    });
  });

  it("debe devolver conversionRate 0 cuando no hay oportunidades terminales", async () => {
    const noTerminal = [
      { ...opportunities[0], pipelineStage: "Lead" as const },
      { ...opportunities[0], pipelineStage: "Contacted" as const },
    ];
    (prisma.opportunity.findMany as any).mockResolvedValue(noTerminal);

    const result = await getDashboardMetrics("user1", customThresholds, now);

    expect(result.conversionRate).toBe(0);
    expect(result.activeDeals).toBe(2);
  });
});
