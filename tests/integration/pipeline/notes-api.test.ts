import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Note, Opportunity } from "../../../src/types";

// Mock de PrismaClient para pruebas de integración de API de notas
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

// Mock de la resolución de sesión (F05-T01): la identidad viene de la cookie
// de sesión validada en servidor, no de cabeceras del cliente (x-user-id).
vi.mock("../../../src/lib/session", () => ({
  getSessionUserId: vi.fn(),
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

// Import dinámico de route handlers
import { getSessionUserId } from "../../../src/lib/session";
const {
  GET: getNotes,
  POST: postNote,
  PUT: putNotes,
  PATCH: patchNotes,
  DELETE: deleteNotes,
} = await import("../../../src/app/api/notes/route");

const {
  PUT: putNoteById,
  PATCH: patchNoteById,
  DELETE: deleteNoteById,
} = await import("../../../src/app/api/notes/[id]/route");

function makeRequest(
  url: string,
  method: string,
  body?: unknown,
  userId?: string,
  rawBody?: string,
) {
  // La identidad se resuelve con la sesión mockeada (cookie en servidor);
  // ya no se envía ninguna cabecera x-user-id.
  (vi.mocked(getSessionUserId) as any).mockResolvedValue(userId ?? null);

  const headers: Record<string, string> = {};
  if (body !== undefined || rawBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let requestBody: string | undefined = undefined;
  if (rawBody !== undefined) {
    requestBody = rawBody;
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
  }

  return new Request(url, {
    method,
    headers,
    body: requestBody,
  });
}

const validOppId = "clh7a8b9c000008l102345678";
const validNoteId = "clh7a8b9c000008l102345699";

const mockOpportunity: Opportunity = {
  id: validOppId,
  userId: "user_note_123",
  clientName: "Alpha Ltd",
  description: "Desarrollo backend",
  estimatedBudget: 3200,
  contactPersonName: "Bob",
  contactChannel: "Email",
  pipelineStage: "Negotiation",
  paymentStatus: null,
  developmentStatus: null,
  isArchived: false,
  createdAt: new Date("2026-11-10T10:00:00Z"),
  updatedAt: new Date("2026-11-10T10:00:00Z"),
};

const mockNote: Note = {
  id: validNoteId,
  opportunityId: validOppId,
  content: "Llamada realizada. Interesados en comenzar el próximo mes.",
  createdAt: new Date("2026-11-11T15:30:00Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/notes", () => {
  it("devuelve 401 si no hay sesión activa", async () => {
    const req = makeRequest(`http://localhost/api/notes?opportunityId=${validOppId}`, "GET");
    const res = await getNotes(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("UNAUTHORIZED");
  });

  it("devuelve 400 si falta opportunityId como query param", async () => {
    const req = makeRequest("http://localhost/api/notes", "GET", undefined, "user_note_123");
    const res = await getNotes(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve 400 si opportunityId no es un cuid válido", async () => {
    const req = makeRequest(
      "http://localhost/api/notes?opportunityId=not-a-cuid",
      "GET",
      undefined,
      "user_note_123",
    );
    const res = await getNotes(req);
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si la oportunidad pertenece a otro usuario (IDOR prevenido)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      userId: "other_user_456",
    });

    const req = makeRequest(
      `http://localhost/api/notes?opportunityId=${validOppId}`,
      "GET",
      undefined,
      "user_note_123",
    );
    const res = await getNotes(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("NOT_FOUND");
  });

  it("retorna 200 con la lista de notas de la oportunidad propia", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpportunity);
    mNote.findMany.mockResolvedValue([mockNote]);

    const req = makeRequest(
      `http://localhost/api/notes?opportunityId=${validOppId}`,
      "GET",
      undefined,
      "user_note_123",
    );
    const res = await getNotes(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe(validNoteId);
    expect(mNote.findMany).toHaveBeenCalledWith({
      where: { opportunityId: validOppId },
      orderBy: { createdAt: "asc" },
    });
  });
});

describe("POST /api/notes", () => {
  it("devuelve 401 si no hay sesión activa", async () => {
    const req = makeRequest("http://localhost/api/notes", "POST", {
      opportunityId: validOppId,
      content: "Nota nueva",
    });
    const res = await postNote(req);
    expect(res.status).toBe(401);
  });

  it("devuelve 400 si el payload es JSON inválido", async () => {
    const req = makeRequest(
      "http://localhost/api/notes",
      "POST",
      undefined,
      "user_note_123",
      "{ invalid-json",
    );
    const res = await postNote(req);
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si falta content o es vacío", async () => {
    const req = makeRequest(
      "http://localhost/api/notes",
      "POST",
      {
        opportunityId: validOppId,
        content: "   ",
      },
      "user_note_123",
    );
    const res = await postNote(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("devuelve 404 si la oportunidad pertenece a otro usuario (IDOR prevenido)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpportunity,
      userId: "intruder_user",
    });

    const req = makeRequest(
      "http://localhost/api/notes",
      "POST",
      {
        opportunityId: validOppId,
        content: "Intento de agregar nota ajena",
      },
      "user_note_123",
    );
    const res = await postNote(req);
    expect(res.status).toBe(404);
  });

  it("crea la nota exitosamente y retorna 201 Created", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpportunity);
    mNote.create.mockResolvedValue(mockNote);

    const req = makeRequest(
      "http://localhost/api/notes",
      "POST",
      {
        opportunityId: validOppId,
        content: "Llamada realizada. Interesados en comenzar el próximo mes.",
      },
      "user_note_123",
    );
    const res = await postNote(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.content).toBe(mockNote.content);
    expect(mNote.create).toHaveBeenCalledWith({
      data: {
        opportunityId: validOppId,
        content: mockNote.content,
      },
    });
  });
});

describe("Inmutabilidad de Notas (ADR-002) — HTTP 405 Method Not Allowed en /api/notes", () => {
  it("rechaza peticiones PUT con 405 Method Not Allowed", async () => {
    const res = await putNotes();
    expect(res.status).toBe(405);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("METHOD_NOT_ALLOWED");
    expect(res.headers.get("Allow")).toContain("GET, POST");
  });

  it("rechaza peticiones PATCH con 405 Method Not Allowed", async () => {
    const res = await patchNotes();
    expect(res.status).toBe(405);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("rechaza peticiones DELETE con 405 Method Not Allowed", async () => {
    const res = await deleteNotes();
    expect(res.status).toBe(405);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("METHOD_NOT_ALLOWED");
  });
});

describe("Inmutabilidad de Notas (ADR-002) — HTTP 405 Method Not Allowed en /api/notes/[id]", () => {
  it("rechaza peticiones PUT con 405 Method Not Allowed", async () => {
    const res = await putNoteById();
    expect(res.status).toBe(405);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("rechaza peticiones PATCH con 405 Method Not Allowed", async () => {
    const res = await patchNoteById();
    expect(res.status).toBe(405);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("rechaza peticiones DELETE con 405 Method Not Allowed", async () => {
    const res = await deleteNoteById();
    expect(res.status).toBe(405);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("METHOD_NOT_ALLOWED");
  });
});
