import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Opportunity } from "../../../src/types";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

const mOpportunity = {
  findUnique: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
};

vi.mocked(PrismaClient).mockImplementation(
  () =>
    ({
      opportunity: mOpportunity,
    }) as unknown as PrismaClient,
);

const { archiveOpportunity, unarchiveOpportunity, listArchivedOpportunities } =
  await import("../../../src/services/archive-service");

beforeEach(() => {
  vi.resetAllMocks();
});

const baseOpportunity: Opportunity = {
  id: "opp_arch_1",
  userId: "user_owner",
  clientName: "Beta Corp",
  description: "Proyecto congelado",
  estimatedBudget: 3000,
  contactPersonName: "Alice",
  contactChannel: "Email",
  pipelineStage: "Negotiation",
  paymentStatus: null,
  developmentStatus: null,
  isArchived: false,
  createdAt: new Date("2026-11-01T08:00:00Z"),
  updatedAt: new Date("2026-11-01T08:00:00Z"),
};

describe("ArchiveService — archiveOpportunity", () => {
  it("marca isArchived: true preservando exactamente el pipelineStage original", async () => {
    mOpportunity.findUnique.mockResolvedValue(baseOpportunity);
    mOpportunity.update.mockResolvedValue({
      ...baseOpportunity,
      isArchived: true,
    });

    const result = await archiveOpportunity("opp_arch_1", "user_owner");

    expect(result.isArchived).toBe(true);
    expect(result.pipelineStage).toBe("Negotiation");
    expect(mOpportunity.update).toHaveBeenCalledWith({
      where: { id: "opp_arch_1" },
      data: { isArchived: true },
    });
  });

  it("rechaza archivar si la oportunidad pertenece a otro usuario (IDOR protection)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...baseOpportunity,
      userId: "other_user",
    });

    await expect(archiveOpportunity("opp_arch_1", "user_owner")).rejects.toThrow(
      /Oportunidad no encontrada o acceso denegado/,
    );
    expect(mOpportunity.update).not.toHaveBeenCalled();
  });

  it("rechaza archivar si la oportunidad no existe", async () => {
    mOpportunity.findUnique.mockResolvedValue(null);

    await expect(archiveOpportunity("unknown", "user_owner")).rejects.toThrow(
      /Oportunidad no encontrada o acceso denegado/,
    );
  });
});

describe("ArchiveService — unarchiveOpportunity", () => {
  it("marca isArchived: false preservando exactamente su pipelineStage original", async () => {
    const archivedOpp = {
      ...baseOpportunity,
      isArchived: true,
      pipelineStage: "ProposalSent" as const,
    };
    mOpportunity.findUnique.mockResolvedValue(archivedOpp);
    mOpportunity.update.mockResolvedValue({
      ...archivedOpp,
      isArchived: false,
    });

    const result = await unarchiveOpportunity("opp_arch_1", "user_owner");

    expect(result.isArchived).toBe(false);
    expect(result.pipelineStage).toBe("ProposalSent");
    expect(mOpportunity.update).toHaveBeenCalledWith({
      where: { id: "opp_arch_1" },
      data: { isArchived: false },
    });
  });

  it("rechaza desarchivar si pertenece a otro usuario (IDOR protection)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...baseOpportunity,
      userId: "intruder",
      isArchived: true,
    });

    await expect(unarchiveOpportunity("opp_arch_1", "user_owner")).rejects.toThrow(
      /Oportunidad no encontrada o acceso denegado/,
    );
    expect(mOpportunity.update).not.toHaveBeenCalled();
  });
});

describe("ArchiveService — listArchivedOpportunities", () => {
  it("devuelve exclusivamente las oportunidades con isArchived: true del usuario autenticado", async () => {
    const archivedList = [
      { ...baseOpportunity, id: "opp_arch_1", isArchived: true },
      { ...baseOpportunity, id: "opp_arch_2", isArchived: true },
    ];
    mOpportunity.findMany.mockResolvedValue(archivedList);

    const result = await listArchivedOpportunities("user_owner");

    expect(mOpportunity.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_owner",
        isArchived: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    expect(result).toHaveLength(2);
    expect(result[0].isArchived).toBe(true);
  });
});
