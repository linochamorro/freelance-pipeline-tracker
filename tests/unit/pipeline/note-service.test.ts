import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Note, Opportunity } from "../../../src/types";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

const mOpportunity = {
  findUnique: vi.fn(),
};

const mNote = {
  create: vi.fn(),
  findMany: vi.fn(),
};

vi.mocked(PrismaClient).mockImplementation(
  () =>
    ({
      opportunity: mOpportunity,
      note: mNote,
    }) as unknown as PrismaClient,
);

const noteServiceModule = await import("../../../src/services/note-service");
const { createNote, listNotes } = noteServiceModule;

beforeEach(() => {
  vi.resetAllMocks();
});

const mockOpp: Opportunity = {
  id: "opp_note_1",
  userId: "user_note_owner",
  clientName: "Gamma LLC",
  description: "Desarrollo MVP",
  estimatedBudget: 8000,
  contactPersonName: "Bob",
  contactChannel: "WhatsApp",
  pipelineStage: "Negotiation",
  paymentStatus: null,
  developmentStatus: null,
  isArchived: false,
  createdAt: new Date("2026-11-05T08:00:00Z"),
  updatedAt: new Date("2026-11-05T08:00:00Z"),
};

const mockNote: Note = {
  id: "note_1",
  opportunityId: "opp_note_1",
  content: "Reunión de requerimientos acordada para el viernes.",
  createdAt: new Date("2026-11-06T12:00:00Z"),
};

describe("NoteService — Inmutabilidad y Append-Only (ADR-002)", () => {
  it("estrictamente NO exporta métodos updateNote ni deleteNote", () => {
    expect((noteServiceModule as any).updateNote).toBeUndefined();
    expect((noteServiceModule as any).deleteNote).toBeUndefined();
    expect((noteServiceModule as any).editNote).toBeUndefined();
    expect((noteServiceModule as any).removeNote).toBeUndefined();
  });
});

describe("NoteService — createNote", () => {
  it("crea una nota cuando la oportunidad pertenece al usuario", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpp);
    mNote.create.mockResolvedValue(mockNote);

    const result = await createNote({
      opportunityId: "opp_note_1",
      userId: "user_note_owner",
      content: "Reunión de requerimientos acordada para el viernes.",
    });

    expect(result.id).toBe("note_1");
    expect(mOpportunity.findUnique).toHaveBeenCalledWith({
      where: { id: "opp_note_1" },
    });
    expect(mNote.create).toHaveBeenCalledWith({
      data: {
        opportunityId: "opp_note_1",
        content: "Reunión de requerimientos acordada para el viernes.",
      },
    });
  });

  it("rechaza agregar nota si la oportunidad no pertenece al usuario (IDOR protection)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      userId: "other_user",
    });

    await expect(
      createNote({
        opportunityId: "opp_note_1",
        userId: "user_note_owner",
        content: "Nota no autorizada",
      }),
    ).rejects.toThrow(/Oportunidad no encontrada o acceso denegado/);

    expect(mNote.create).not.toHaveBeenCalled();
  });

  it("rechaza agregar nota si la oportunidad no existe", async () => {
    mOpportunity.findUnique.mockResolvedValue(null);

    await expect(
      createNote({
        opportunityId: "unknown_opp",
        userId: "user_note_owner",
        content: "Nota huérfana",
      }),
    ).rejects.toThrow(/Oportunidad no encontrada o acceso denegado/);

    expect(mNote.create).not.toHaveBeenCalled();
  });

  it("rechaza notas con contenido vacío o compuesto solo por espacios", async () => {
    await expect(
      createNote({
        opportunityId: "opp_note_1",
        userId: "user_note_owner",
        content: "   ",
      }),
    ).rejects.toThrow(/El contenido de la nota no puede estar vacío/);
  });
});

describe("NoteService — listNotes", () => {
  it("lista las notas ordenadas cronológicamente cuando la oportunidad pertenece al usuario", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpp);
    mNote.findMany.mockResolvedValue([mockNote]);

    const result = await listNotes("opp_note_1", "user_note_owner");

    expect(result).toHaveLength(1);
    expect(mNote.findMany).toHaveBeenCalledWith({
      where: { opportunityId: "opp_note_1" },
      orderBy: { createdAt: "asc" },
    });
  });

  it("rechaza listar notas si la oportunidad no pertenece al usuario (IDOR protection)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      userId: "other_user",
    });

    await expect(listNotes("opp_note_1", "user_note_owner")).rejects.toThrow(
      /Oportunidad no encontrada o acceso denegado/,
    );
    expect(mNote.findMany).not.toHaveBeenCalled();
  });
});
