// tests/integration/auth/auth-session.test.ts
// Pruebas de integración de los Route Handlers de autenticación (F05-T01):
// register, login, logout y session. Mocks de servicios, Prisma y bcrypt.
// Los tokens/contraseñas usados aquí son valores fijos ficticios; nunca se
// imprimen valores reales de secretos ni de .env (Gate G-3).
//
// Entorno "node" (por archivo): prueba pura de API sin DOM; evita que jsdom
// externalice módulos nativos de Node usados por la cadena de imports.

// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

// Instancia estable de Prisma mockeada, compartida por todos los servicios
// (vi.hoisted permite referenciarla desde las factorías de vi.mock).
const m = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    session: { create: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn() },
    opportunity: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    verificationToken: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  },
}));

// Mock de PrismaClient (patrón de tests/integration/pipeline/opportunities-api.test.ts)
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => m.prisma),
}));

// Mock del servicio de autenticación (registro y acceso a prisma)
vi.mock("../../../src/services/auth-service", async () => {
  const actual = await vi.importActual<typeof import("../../../src/services/auth-service")>(
    "../../../src/services/auth-service",
  );
  return {
    ...actual,
    prisma: m.prisma,
    registerUser: vi.fn(),
  };
});

// Mock del servicio de sesión
vi.mock("../../../src/services/session-service", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  validateSession: vi.fn(),
}));

// Mock de la resolución de sesión (cookie)
vi.mock("../../../src/lib/session", () => ({
  getSessionUserId: vi.fn(),
}));

// Mock de bcryptjs (evita cómputo real de hash; los tests H-1 inspeccionan args)
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
  compare: vi.fn(),
  hash: vi.fn(),
}));

import { prisma, registerUser, LOGIN_SENTINEL_HASH } from "../../../src/services/auth-service";
import { prisma as opportunityPrisma } from "../../../src/services/opportunity-service";
import {
  createSession,
  deleteSession,
} from "../../../src/services/session-service";
import { getSessionUserId } from "../../../src/lib/session";
import bcrypt from "bcryptjs";
import { POST as registerRoute } from "../../../src/app/api/auth/register/route";
import { POST as loginRoute } from "../../../src/app/api/auth/login/route";
import { POST as logoutRoute } from "../../../src/app/api/auth/logout/route";
import { GET as getSessionRoute } from "../../../src/app/api/auth/session/route";
import { GET as listOpportunities } from "../../../src/app/api/opportunities/route";

const FICTITIOUS_TOKEN = "token-ficticio-de-prueba-0001234567890abcdefghijklmn";

// Hash bcrypt válido de coste 12 (60 chars). Se usa el centinela como hash
// almacenado "válido" para la vía existente: isValidCost12BcryptHash lo acepta.
const VALID_COST12_HASH = LOGIN_SENTINEL_HASH;

const mockUser = {
  id: "u1",
  name: "Ana García",
  email: "ana@example.com",
  passwordHash: VALID_COST12_HASH,
};

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function cookieOf(res: Response): string {
  return res.headers.get("set-cookie") ?? "";
}

beforeEach(() => {
  vi.resetAllMocks();
  (createSession as any).mockResolvedValue({
    sessionToken: FICTITIOUS_TOKEN,
    expires: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });
  (deleteSession as any).mockResolvedValue(undefined);
});

describe("POST /api/auth/register", () => {
  it("registra, crea sesión y responde 201 con datos públicos (sin passwordHash) + cookie httpOnly", async () => {
    (registerUser as any).mockResolvedValue(mockUser);

    const res = await registerRoute(
      jsonRequest("http://localhost/api/auth/register", {
        name: "Ana García",
        email: "ana@example.com",
        password: "ClaveSegura123",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // Datos públicos del usuario: nunca passwordHash
    expect(json.data).toEqual({ id: "u1", name: "Ana García", email: "ana@example.com" });
    expect(JSON.stringify(json)).not.toContain("passwordHash");
    expect(registerUser).toHaveBeenCalledWith({
      name: "Ana García",
      email: "ana@example.com",
      password: "ClaveSegura123",
    });

    // Sesión creada para el usuario registrado
    expect(createSession).toHaveBeenCalledWith("u1");

    // Cookie de sesión con flags de seguridad
    const setCookie = cookieOf(res);
    expect(setCookie).toContain("sessionToken=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=2592000");

    // El token NUNCA viaja en el body
    expect(JSON.stringify(json)).not.toContain(FICTITIOUS_TOKEN);
  });

  it("responde 409 EMAIL_IN_USE cuando el email ya está registrado", async () => {
    const duplicateError = Object.assign(
      new Error("Unique constraint failed on the fields: (`User`.`email`)"),
      { code: "P2002" },
    );
    (registerUser as any).mockRejectedValue(duplicateError);

    const res = await registerRoute(
      jsonRequest("http://localhost/api/auth/register", {
        name: "Otra Ana",
        email: "ana@example.com",
        password: "ClaveSegura123",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("EMAIL_IN_USE");
  });

  it("responde 400 VALIDATION_ERROR para payload inválido y no llama al registro", async () => {
    const res = await registerRoute(
      jsonRequest("http://localhost/api/auth/register", {
        email: "no-es-un-email",
        password: "corta",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(registerUser).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login (ADR-006: no enumeración, H-1 estructural)", () => {
  it("responde 200 con datos públicos y cookie de sesión ante credenciales válidas", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);

    const res = await loginRoute(
      jsonRequest("http://localhost/api/auth/login", {
        email: "ana@example.com",
        password: "ClaveSegura123",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ id: "u1", name: "Ana García", email: "ana@example.com" });
    expect(JSON.stringify(json)).not.toContain("passwordHash");
    expect(createSession).toHaveBeenCalledWith("u1");
  });

  it("H-1: ejecuta bcrypt.compare exactamente una vez con hash coste 12 válido en las tres vías y responde idéntico sin sesión en fallos", async () => {
    const reqExistingWrong = jsonRequest("http://localhost/api/auth/login", {
      email: "ana@example.com",
      password: "Incorrecta999",
    });
    const reqMissing = jsonRequest("http://localhost/api/auth/login", {
      email: "desconocida@example.com",
      password: "Incorrecta999",
    });
    const reqNoHash = jsonRequest("http://localhost/api/auth/login", {
      email: "sinhash@example.com",
      password: "Incorrecta999",
    });

    // Vía 1: usuario existente con hash válido, contraseña incorrecta
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(false);
    const resExistingWrong = await loginRoute(reqExistingWrong);
    const jsonExistingWrong = await resExistingWrong.json();
    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    expect((bcrypt.compare as any).mock.calls[0][0]).toBe("Incorrecta999");
    expect((bcrypt.compare as any).mock.calls[0][1]).toBe(VALID_COST12_HASH);
    expect((bcrypt.compare as any).mock.calls[0][1]).toMatch(/^\$2[aby]\$12\$/);
    expect(((bcrypt.compare as any).mock.calls[0][1] as string).length).toBe(60);

    // Vía 2: usuario inexistente -> mismo hash centinela fijo
    vi.clearAllMocks();
    (createSession as any).mockResolvedValue({ sessionToken: FICTITIOUS_TOKEN, expires: new Date(Date.now() + 30 * 24 * 3600 * 1000) });
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (bcrypt.compare as any).mockResolvedValue(false);
    const resMissing = await loginRoute(reqMissing);
    const jsonMissing = await resMissing.json();
    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    expect((bcrypt.compare as any).mock.calls[0][1]).toBe(LOGIN_SENTINEL_HASH);
    expect((bcrypt.compare as any).mock.calls[0][1]).toMatch(/^\$2[aby]\$12\$/);
    expect(((bcrypt.compare as any).mock.calls[0][1] as string).length).toBe(60);

    // Vía 3: usuario existente sin hash válido -> mismo hash centinela fijo
    vi.clearAllMocks();
    (createSession as any).mockResolvedValue({ sessionToken: FICTITIOUS_TOKEN, expires: new Date(Date.now() + 30 * 24 * 3600 * 1000) });
    (prisma.user.findUnique as any).mockResolvedValue({ ...mockUser, email: "sinhash@example.com", passwordHash: null });
    (bcrypt.compare as any).mockResolvedValue(false);
    const resNoHash = await loginRoute(reqNoHash);
    const jsonNoHash = await resNoHash.json();
    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    expect((bcrypt.compare as any).mock.calls[0][1]).toBe(LOGIN_SENTINEL_HASH);

    // Respuesta byte a byte idéntica y sin sesión en las tres vías de fallo
    for (const [res, json] of [
      [resExistingWrong, jsonExistingWrong],
      [resMissing, jsonMissing],
      [resNoHash, jsonNoHash],
    ] as const) {
      expect(res.status).toBe(401);
      expect(json).toEqual({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Credenciales inválidas" } });
    }
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/logout (idempotente)", () => {
  it("elimina la sesión, responde 200 ok(null) y expira la cookie", async () => {
    const res = await logoutRoute(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: `sessionToken=${FICTITIOUS_TOKEN}` },
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeNull();
    expect(deleteSession).toHaveBeenCalledWith(FICTITIOUS_TOKEN);

    const setCookie = cookieOf(res);
    expect(setCookie).toContain("sessionToken=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("responde 200 idéntico aunque no exista cookie (idempotente)", async () => {
    const res = await logoutRoute(
      new Request("http://localhost/api/auth/logout", { method: "POST" }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeNull();
    expect(deleteSession).not.toHaveBeenCalled();
    expect(cookieOf(res)).toContain("Max-Age=0");
  });
});

describe("GET /api/auth/session", () => {
  it("responde 401 UNAUTHORIZED cuando no hay sesión", async () => {
    (getSessionUserId as any).mockResolvedValue(null);

    const res = await getSessionRoute(
      new Request("http://localhost/api/auth/session"),
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("responde 200 authenticated:true con datos públicos del usuario cuando hay sesión", async () => {
    (getSessionUserId as any).mockResolvedValue("u1");
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u1",
      name: "Ana García",
      email: "ana@example.com",
    });

    const res = await getSessionRoute(
      new Request("http://localhost/api/auth/session"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.authenticated).toBe(true);
    expect(json.data.user).toEqual({ id: "u1", name: "Ana García", email: "ana@example.com" });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { id: true, name: true, email: true },
    });
  });
});

describe("Aislamiento por sesión en /api/opportunities (migración x-user-id)", () => {
  it("responde 401 UNAUTHORIZED cuando getSessionUserId devuelve null", async () => {
    (getSessionUserId as any).mockResolvedValue(null);

    const res = await listOpportunities(
      new Request("http://localhost/api/opportunities"),
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("responde 200 con datos del usuario cuando hay sesión activa", async () => {
    (getSessionUserId as any).mockResolvedValue("u1");
    (opportunityPrisma.opportunity.findMany as any).mockResolvedValue([
      {
        id: "opp1",
        userId: "u1",
        clientName: "Acme",
        description: "d",
        estimatedBudget: 100,
        contactPersonName: "p",
        contactChannel: "Email",
        pipelineStage: "Lead",
        paymentStatus: null,
        developmentStatus: null,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const res = await listOpportunities(
      new Request("http://localhost/api/opportunities"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].userId).toBe("u1");
  });
});
