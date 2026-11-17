import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Opportunity } from "../../../src/types";

// Mock de PrismaClient a nivel de persistencia para pruebas de integración de API
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

// Mock de la resolución de sesión (F05-T01): la identidad viene de la cookie
// de sesión validada en servidor, no de cabeceras del cliente (x-user-id).
vi.mock("../../../src/lib/session", () => ({
  getSessionUserId: vi.fn(),
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

mTxFn = vi.fn(async (cb: (tx: { opportunity: typeof mOpportunity; stageChange: typeof mStageChange; subStateChange: typeof mSubStateChange }) => unknown) =>
  cb({
    opportunity: mOpportunity,
    stageChange: mStageChange,
    subStateChange: mSubStateChange,
  }),
);

// Import dinámico de route handlers
import { getSessionUserId } from "../../../src/lib/session";
const { GET: getOpportunities, POST: postOpportunity } = await import(
  "../../../src/app/api/opportunities/route"
);
const {
  GET: getOpportunity,
  PATCH: patchOpportunity,
  DELETE: deleteOpportunityRoute,
} = await import("../../../src/app/api/opportunities/[id]/route");
const { POST: archiveOpportunityRoute } = await import(
  "../../../src/app/api/opportunities/[id]/archive/route"
);

function makeRequest(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
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

const validCuid = "clh7a8b9c000008l102345678";
const otherCuid = "clh7a8b9c000008l102345679";

const mockOpp: Opportunity = {
  id: validCuid,
  userId: "user_test_123",
  clientName: "Acme Corporation",
  description: "Desarrollo de plataforma SaaS",
  estimatedBudget: 5000,
  contactPersonName: "Alice Smith",
  contactChannel: "LinkedIn",
  pipelineStage: "Lead",
  paymentStatus: null,
  developmentStatus: null,
  isArchived: false,
  createdAt: new Date("2026-11-10T12:00:00Z"),
  updatedAt: new Date("2026-11-10T12:00:00Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
  mTxFn!.mockImplementation(async (cb) =>
    cb({
      opportunity: mOpportunity,
      stageChange: mStageChange,
      subStateChange: mSubStateChange,
    }),
  );
});

describe("GET /api/opportunities", () => {
  it("devuelve 401 si no hay sesión activa", async () => {
    const req = makeRequest("http://localhost/api/opportunities", "GET");
    const res = await getOpportunities(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("UNAUTHORIZED");
  });

  it("retorna 200 y la lista de oportunidades del usuario", async () => {
    mOpportunity.findMany.mockResolvedValue([mockOpp]);

    const req = makeRequest(
      "http://localhost/api/opportunities",
      "GET",
      undefined,
      "user_test_123",
    );
    const res = await getOpportunities(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe(validCuid);
    expect(mOpportunity.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_test_123",
        isArchived: false,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("filtra por isArchived=true cuando se especifica en query param", async () => {
    mOpportunity.findMany.mockResolvedValue([{ ...mockOpp, isArchived: true }]);

    const req = makeRequest(
      "http://localhost/api/opportunities?isArchived=true",
      "GET",
      undefined,
      "user_test_123",
    );
    const res = await getOpportunities(req);
    expect(res.status).toBe(200);
    expect(mOpportunity.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_test_123",
        isArchived: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("filtra por etapa y canal", async () => {
    const oppLinkedIn = { ...mockOpp, contactChannel: "LinkedIn" as const };
    const oppEmail = {
      ...mockOpp,
      id: otherCuid,
      contactChannel: "Email" as const,
    };
    mOpportunity.findMany.mockResolvedValue([oppLinkedIn, oppEmail]);

    const req = makeRequest(
      "http://localhost/api/opportunities?stage=Lead&channel=LinkedIn",
      "GET",
      undefined,
      "user_test_123",
    );
    const res = await getOpportunities(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].contactChannel).toBe("LinkedIn");
  });
});

describe("POST /api/opportunities", () => {
  it("devuelve 401 si no hay sesión activa", async () => {
    const req = makeRequest("http://localhost/api/opportunities", "POST", {
      clientName: "Acme",
    });
    const res = await postOpportunity(req);
    expect(res.status).toBe(401);
  });

  it("devuelve 400 si el cuerpo no es JSON válido", async () => {
    const req = makeRequest(
      "http://localhost/api/opportunities",
      "POST",
      undefined,
      "user_test_123",
      "{ invalid-json",
    );
    const res = await postOpportunity(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve 400 si faltan campos obligatorios en el esquema Zod", async () => {
    const req = makeRequest(
      "http://localhost/api/opportunities",
      "POST",
      {
        clientName: "A", // Demasiado corto (min 2)
        description: "B",
      },
      "user_test_123",
    );
    const res = await postOpportunity(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve 400 si el canal no pertenece a los 7 canónicos (ADR-004)", async () => {
    const req = makeRequest(
      "http://localhost/api/opportunities",
      "POST",
      {
        clientName: "Empresa Valida",
        description: "Descripcion suficiente para el proyecto",
        estimatedBudget: 1500,
        contactPersonName: "Carlos",
        contactChannel: "Instagram", // No canónico
      },
      "user_test_123",
    );
    const res = await postOpportunity(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("crea oportunidad exitosamente y devuelve 201 Created", async () => {
    mOpportunity.create.mockResolvedValue(mockOpp);

    const req = makeRequest(
      "http://localhost/api/opportunities",
      "POST",
      {
        clientName: "Acme Corporation",
        description: "Desarrollo de plataforma SaaS",
        estimatedBudget: 5000,
        contactPersonName: "Alice Smith",
        contactChannel: "LinkedIn",
      },
      "user_test_123",
    );

    const res = await postOpportunity(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(validCuid);
    expect(mOpportunity.create).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/opportunities/[id]", () => {
  it("devuelve 401 sin sesión", async () => {
    const req = makeRequest(`http://localhost/api/opportunities/${validCuid}`, "GET");
    const res = await getOpportunity(req, { params: { id: validCuid } });
    expect(res.status).toBe(401);
  });

  it("devuelve 400 si el ID no es un cuid válido", async () => {
    const req = makeRequest(
      "http://localhost/api/opportunities/not-a-cuid",
      "GET",
      undefined,
      "user_test_123",
    );
    const res = await getOpportunity(req, { params: { id: "not-a-cuid" } });
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si la oportunidad pertenece a otro usuario (IDOR prevenido)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      userId: "other_user_456",
    });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}`,
      "GET",
      undefined,
      "user_test_123",
    );
    const res = await getOpportunity(req, { params: { id: validCuid } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("NOT_FOUND");
  });

  it("devuelve 200 con los datos de la oportunidad propia", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpp);

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}`,
      "GET",
      undefined,
      "user_test_123",
    );
    const res = await getOpportunity(req, { params: { id: validCuid } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.clientName).toBe("Acme Corporation");
  });
});

describe("PATCH /api/opportunities/[id]", () => {
  it("devuelve 401 si no hay sesión activa", async () => {
    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}`,
      "PATCH",
      { clientName: "Nuevo" },
    );
    const res = await patchOpportunity(req, { params: { id: validCuid } });
    expect(res.status).toBe(401);
  });

  it("devuelve 400 si id no es un cuid válido", async () => {
    const req = makeRequest(
      "http://localhost/api/opportunities/invalid-id",
      "PATCH",
      { clientName: "Nuevo" },
      "user_test_123",
    );
    const res = await patchOpportunity(req, { params: { id: "invalid-id" } });
    expect(res.status).toBe(400);
  });

  it("devuelve 404 ante intento de actualizar oportunidad de otro usuario (IDOR)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      userId: "other_user_456",
    });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}`,
      "PATCH",
      { clientName: "Hack" },
      "user_test_123",
    );
    const res = await patchOpportunity(req, { params: { id: validCuid } });
    expect(res.status).toBe(404);
  });

  it("devuelve 400 si se intenta salto de etapa inválido (reglas puras)", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      pipelineStage: "Lead",
    });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}`,
      "PATCH",
      { pipelineStage: "ProposalSent" }, // Salto inválido desde Lead
      "user_test_123",
    );
    const res = await patchOpportunity(req, { params: { id: validCuid } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.message).toMatch(/Transición inválida/);
  });

  it("ejecuta transición Kanban válida (Lead -> Contacted) y responde 200 OK", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      pipelineStage: "Lead",
    });
    const updatedOpp = {
      ...mockOpp,
      pipelineStage: "Contacted" as const,
    };
    mOpportunity.update.mockResolvedValue(updatedOpp);

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}`,
      "PATCH",
      {
        pipelineStage: "Contacted",
        observation: "Primer contacto realizado",
      },
      "user_test_123",
    );

    const res = await patchOpportunity(req, { params: { id: validCuid } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.pipelineStage).toBe("Contacted");
  });
});

describe("DELETE /api/opportunities/[id]", () => {
  it("devuelve 401 si no hay sesión activa", async () => {
    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}`,
      "DELETE",
    );
    const res = await deleteOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(401);
  });

  it("devuelve 404 si pertenece a otro usuario", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      userId: "other_user",
    });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}`,
      "DELETE",
      undefined,
      "user_test_123",
    );
    const res = await deleteOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(404);
  });

  it("elimina oportunidad propia y responde 200 con ApiResponse", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpp);
    mOpportunity.delete.mockResolvedValue(mockOpp);

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}`,
      "DELETE",
      undefined,
      "user_test_123",
    );
    const res = await deleteOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(validCuid);
  });
});

describe("POST /api/opportunities/[id]/archive", () => {
  it("devuelve 401 si no hay sesión activa", async () => {
    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(401);
  });

  it("devuelve 404 si la oportunidad pertenece a otro usuario", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      userId: "other_user",
    });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      { isArchived: true },
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(404);
  });

  it("archiva la oportunidad preservando pipelineStage (isArchived: true)", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpp);
    mOpportunity.update.mockResolvedValue({
      ...mockOpp,
      isArchived: true,
    });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      { isArchived: true },
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isArchived).toBe(true);
    expect(json.data.pipelineStage).toBe("Lead");
  });

  it("desarchiva la oportunidad con isArchived: false", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      isArchived: true,
    });
    mOpportunity.update.mockResolvedValue({
      ...mockOpp,
      isArchived: false,
    });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      { isArchived: false },
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isArchived).toBe(false);
  });

  it("conmuta alternativamente (toggle) si no se especifica cuerpo", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      isArchived: false,
    });
    mOpportunity.update.mockResolvedValue({
      ...mockOpp,
      isArchived: true,
    });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      undefined,
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.isArchived).toBe(true);
  });
});

// H-5 (F05-T01 loop 2/3): validación Zod del cuerpo del endpoint de archivo.
// Preserva la semántica archive/unarchive/toggle y el IDOR (404 por recurso ajeno).
describe("POST /api/opportunities/[id]/archive — validación Zod (H-5)", () => {
  it("acepta action: 'archive' y archiva la oportunidad", async () => {
    mOpportunity.findUnique.mockResolvedValue(mockOpp);
    mOpportunity.update.mockResolvedValue({ ...mockOpp, isArchived: true });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      { action: "archive" },
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isArchived).toBe(true);
  });

  it("acepta action: 'unarchive' y desarchiva la oportunidad", async () => {
    mOpportunity.findUnique.mockResolvedValue({ ...mockOpp, isArchived: true });
    mOpportunity.update.mockResolvedValue({ ...mockOpp, isArchived: false });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      { action: "unarchive" },
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isArchived).toBe(false);
  });

  it("hace toggle con un cuerpo vacío (sin isArchived ni action)", async () => {
    mOpportunity.findUnique.mockResolvedValue({ ...mockOpp, isArchived: false });
    mOpportunity.update.mockResolvedValue({ ...mockOpp, isArchived: true });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      {},
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isArchived).toBe(true);
  });

  it("devuelve 400 VALIDATION_ERROR con JSON malformado", async () => {
    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      undefined,
      "user_test_123",
      "{ esto-no-es-json",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve 400 VALIDATION_ERROR si isArchived no es booleano", async () => {
    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      { isArchived: "true" },
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve 400 VALIDATION_ERROR si action es inválida", async () => {
    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      { action: "delete" },
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve 400 VALIDATION_ERROR si la raíz del cuerpo es un array", async () => {
    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      [],
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve 400 VALIDATION_ERROR si la raíz del cuerpo es un string", async () => {
    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      "archivar",
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve 404 NOT_FOUND (IDOR) con recurso ajeno en la vía toggle", async () => {
    mOpportunity.findUnique.mockResolvedValue({
      ...mockOpp,
      userId: "other_user",
      isArchived: false,
    });

    const req = makeRequest(
      `http://localhost/api/opportunities/${validCuid}/archive`,
      "POST",
      {},
      "user_test_123",
    );
    const res = await archiveOpportunityRoute(req, { params: { id: validCuid } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe("NOT_FOUND");
  });
});
