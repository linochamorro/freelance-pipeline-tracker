import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Opportunity, PipelineStage, ContactChannel, PaymentStatus, DevelopmentStatus } from "../../../src/types";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

const mOpportunity = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mStageChange = {
  create: vi.fn(),
};

const mSubStateChange = {
  create: vi.fn(),
};

let mTxFn: ReturnType<typeof vi.fn> | undefined;

vi.mocked(PrismaClient).mockImplementation(
  () =>
    ({
      opportunity: mOpportunity,
      stageChange: mStageChange,
      subStateChange: mSubStateChange,
      $transaction: mTxFn,
    }) as unknown as PrismaClient,
);

mTxFn = vi.fn(async (cb: (tx: { opportunity: typeof mOpportunity; stageChange: typeof mStageChange; subStateChange: typeof mSubStateChange; $transaction: unknown }) => unknown) =>
  cb({
    opportunity: mOpportunity,
    stageChange: mStageChange,
    subStateChange: mSubStateChange,
    $transaction: mTxFn,
  }),
);

const {
  createOpportunity,
  getOpportunityById,
  listOpportunities,
  updateOpportunity,
  deleteOpportunity,
} = await import("../../../src/services/opportunity-service");

beforeEach(() => {
  vi.resetAllMocks();
  mTxFn!.mockImplementation(async (cb) =>
    cb({
      opportunity: mOpportunity,
      stageChange: mStageChange,
      subStateChange: mSubStateChange,
      $transaction: mTxFn!,
    }),
  );
});

const mockOpportunity: Opportunity = {
  id: "opp_1",
  userId: "user_123",
  clientName: "Acme Corp",
  description: "Rediseño de plataforma web",
  estimatedBudget: 4500,
  contactPersonName: "John Doe",
  contactChannel: "LinkedIn",
  pipelineStage: "Lead",
  paymentStatus: null,
  developmentStatus: null,
  isArchived: false,
  createdAt: new Date("2026-11-10T10:00:00Z"),
  updatedAt: new Date("2026-11-10T10:00:00Z"),
};

describe("OpportunityService — createOpportunity", () => {
  it("crea una oportunidad con pipelineStage 'Lead' por defecto si no se especifica", async () => {
    mOpportunity.create.mockResolvedValue(mockOpportunity);

    const input = {
      userId: "user_123",
      clientName: "Acme Corp",
      description: "Rediseño de plataforma web",
      estimatedBudget: 4500,
      contactPersonName: "John Doe",
      contactChannel: "LinkedIn" as ContactChannel,
    };

    const result = await createOpportunity(input);

    expect(mOpportunity.create).toHaveBeenCalledTimes(1);
    const createCall = mOpportunity.create.mock.calls[0][0];
    expect(createCall.data.pipelineStage).toBe("Lead");
    expect(createCall.data.userId).toBe("user_123");
    expect(createCall.data.clientName).toBe("Acme Corp");
    expect(result.id).toBe("opp_1");
  });

  it("rechaza canal de contacto inválido fuera de los 7 canónicos (ADR-004)", async () => {
    const input = {
      userId: "user_123",
      clientName: "Acme Corp",
      description: "Rediseño de plataforma web",
      estimatedBudget: 4500,
      contactPersonName: "John Doe",
      contactChannel: "Twitter" as any,
    };

    await expect(createOpportunity(input)).rejects.toThrow(/Canal de contacto inválido/);
  });

  it("rechaza presupuesto negativo o datos vacíos", async () => {
    const input = {
      userId: "user_123",
      clientName: "",
      description: "Rediseño",
      estimatedBudget: -100,
      contactPersonName: "John Doe",
      contactChannel: "LinkedIn" as ContactChannel,
    };

    await expect(createOpportunity(input)).rejects.toThrow();
  });
});

describe("OpportunityService — getOpportunityById (IDOR protection)", () => {
  it("retorna la oportunidad si pertenece al usuario", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpportunity);

    const result = await getOpportunityById("opp_1", "user_123");
    expect(result).toEqual(mockOpportunity);
    expect(mOpportunity.findUnique).toHaveBeenCalledWith({ where: { id: "opp_1" } });
  });

  it("lanza error descriptivo si la oportunidad no existe", async () => {
    mOpportunity.findUnique.mockResolvedValue(null);

    await expect(getOpportunityById("opp_unknown", "user_123")).rejects.toThrow(
      /Oportunidad no encontrada o acceso no autorizado/,
    );
  });

  it("lanza error descriptivo si pertenece a otro usuario (IDOR prevenido)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      userId: "other_user",
    });

    await expect(getOpportunityById("opp_1", "user_123")).rejects.toThrow(
      /Oportunidad no encontrada o acceso no autorizado/,
    );
  });
});

describe("OpportunityService — listOpportunities", () => {
  it("filtra estrictamente por userId y por defecto solo oportunidades activas (isArchived: false)", async () => {
    mOpportunity.findMany.mockResolvedValue([mockOpportunity]);

    const result = await listOpportunities("user_123");

    expect(mOpportunity.findMany).toHaveBeenCalledTimes(1);
    expect(mOpportunity.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_123",
        isArchived: false,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(1);
  });

  it("permite filtrar por etapa específica", async () => {
    mOpportunity.findMany.mockResolvedValue([mockOpportunity]);

    await listOpportunities("user_123", { stage: "Lead" });

    expect(mOpportunity.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_123",
        isArchived: false,
        pipelineStage: "Lead",
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("OpportunityService — updateOpportunity y Transiciones Kanban", () => {
  it("permite transición válida de Lead a Contacted y registra StageChange + SubStateChange", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Lead",
    });

    const updatedOpp = {
      ...mockOpportunity,
      pipelineStage: "Contacted" as PipelineStage,
    };
    mOpportunity.update.mockResolvedValue(updatedOpp);

    const result = await updateOpportunity("opp_1", "user_123", {
      pipelineStage: "Contacted",
      observation: "Llamada inicial completada",
    });

    expect(result.pipelineStage).toBe("Contacted");
    expect(mStageChange.create).toHaveBeenCalledWith({
      data: {
        opportunityId: "opp_1",
        fromStage: "Lead",
        toStage: "Contacted",
      },
    });
    expect(mSubStateChange.create).toHaveBeenCalledWith({
      data: {
        opportunityId: "opp_1",
        field: "pipelineStage",
        fromValue: "Lead",
        toValue: "Contacted",
        observation: "Llamada inicial completada",
      },
    });
  });

  it("rechaza transición inválida (saltar etapas de Lead a ProposalSent)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Lead",
    });

    await expect(
      updateOpportunity("opp_1", "user_123", {
        pipelineStage: "ProposalSent",
      }),
    ).rejects.toThrow(/Transición inválida de Lead a ProposalSent/);
  });

  it("rechaza transicionar a 'On Hold'", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Lead",
    });

    await expect(
      updateOpportunity("opp_1", "user_123", {
        pipelineStage: "On Hold" as any,
      }),
    ).rejects.toThrow();
  });

  it("rechaza transiciones de salida desde etapas terminales (Completed y Rejected)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Completed",
    });

    await expect(
      updateOpportunity("opp_1", "user_123", {
        pipelineStage: "InProgress",
      }),
    ).rejects.toThrow(/Transición inválida de Completed a InProgress/);

    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Rejected",
    });

    await expect(
      updateOpportunity("opp_1", "user_123", {
        pipelineStage: "Lead",
      }),
    ).rejects.toThrow(/Transición inválida de Rejected a Lead/);
  });

  it("permite transición a Rejected desde cualquier etapa intermedia", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "ProposalSent",
    });
    mOpportunity.update.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Rejected",
    });

    const result = await updateOpportunity("opp_1", "user_123", {
      pipelineStage: "Rejected",
      observation: "Cliente eligió otra opción",
    });

    expect(result.pipelineStage).toBe("Rejected");
    expect(mStageChange.create).toHaveBeenCalledWith({
      data: {
        opportunityId: "opp_1",
        fromStage: "ProposalSent",
        toStage: "Rejected",
      },
    });
  });

  it("actualiza developmentStatus únicamente cuando la etapa es Accepted y registra SubStateChange", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Accepted",
      developmentStatus: null,
    });
    mOpportunity.update.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Accepted",
      developmentStatus: "InProgress",
    });

    const result = await updateOpportunity("opp_1", "user_123", {
      developmentStatus: "InProgress",
      observation: "Sprint 1 arrancado",
    });

    expect(result.developmentStatus).toBe("InProgress");
    expect(mSubStateChange.create).toHaveBeenCalledWith({
      data: {
        opportunityId: "opp_1",
        field: "developmentStatus",
        fromValue: "None",
        toValue: "InProgress",
        observation: "Sprint 1 arrancado",
      },
    });
  });

  it("rechaza activar developmentStatus si la etapa no es Accepted", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Lead",
    });

    await expect(
      updateOpportunity("opp_1", "user_123", {
        developmentStatus: "InProgress",
      }),
    ).rejects.toThrow(/No se puede activar el estado de desarrollo InProgress en la etapa Lead/);
  });

  it("actualiza paymentStatus únicamente cuando la etapa es ProposalSent y registra SubStateChange", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "ProposalSent",
      paymentStatus: null,
    });
    mOpportunity.update.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "ProposalSent",
      paymentStatus: "Pending",
    });

    const result = await updateOpportunity("opp_1", "user_123", {
      paymentStatus: "Pending",
      observation: "Factura enviada proforma",
    });

    expect(result.paymentStatus).toBe("Pending");
    expect(mSubStateChange.create).toHaveBeenCalledWith({
      data: {
        opportunityId: "opp_1",
        field: "paymentStatus",
        fromValue: "None",
        toValue: "Pending",
        observation: "Factura enviada proforma",
      },
    });
  });

  it("rechaza activar paymentStatus si la etapa no es ProposalSent", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      pipelineStage: "Lead",
    });

    await expect(
      updateOpportunity("opp_1", "user_123", {
        paymentStatus: "Pending",
      }),
    ).rejects.toThrow(/No se puede activar el estado de pago Pending en la etapa Lead/);
  });

  it("impide actualización por IDOR si no pertenece al usuario", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      userId: "other_user",
    });

    await expect(
      updateOpportunity("opp_1", "user_123", { clientName: "Hacked" }),
    ).rejects.toThrow(/Oportunidad no encontrada o acceso no autorizado/);
  });
});

describe("OpportunityService — deleteOpportunity (IDOR protection)", () => {
  it("elimina la oportunidad si pertenece al usuario", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpportunity);
    mOpportunity.delete.mockResolvedValue(mockOpportunity);

    const result = await deleteOpportunity("opp_1", "user_123");
    expect(result.id).toBe("opp_1");
    expect(mOpportunity.delete).toHaveBeenCalledWith({ where: { id: "opp_1" } });
  });

  it("rechaza eliminación si la oportunidad pertenece a otro usuario", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      userId: "other_user",
    });

    await expect(deleteOpportunity("opp_1", "user_123")).rejects.toThrow(
      /Oportunidad no encontrada o acceso no autorizado/,
    );
    expect(mOpportunity.delete).not.toHaveBeenCalled();
  });
});
