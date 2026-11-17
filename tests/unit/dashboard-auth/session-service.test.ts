// tests/unit/dashboard-auth/session-service.test.ts
// Pruebas unitarias del servicio de sesión (F05-T01).
// Ciclo SDD+TDD: RED → GREEN → REFACTOR. Mock de PrismaClient siguiendo el
// patrón de tests/unit/dashboard-auth/auth-service.test.ts.
// Los tokens usados en aserciones son valores fijos ficticios; nunca se
// imprimen valores de tokens reales generados.
//
// Entorno "node" (por archivo): el servicio real usa randomBytes de
// node:crypto y el entorno jsdom de Vitest externaliza los módulos nativos
// de Node para navegador, lo que rompería su ejecución. Con entorno node el
// import nativo se resuelve realmente; PrismaClient sigue mockeado.

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock de PrismaClient antes de importar el servicio
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
  })),
}));

import { prisma } from "../../../src/services/session-service";
import {
  createSession,
  deleteSession,
  validateSession,
} from "../../../src/services/session-service";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Token ficticio con formato base64url válido de 32 bytes (43 caracteres),
// equivalente al que produce crypto.randomBytes(32).toString("base64url").
const FAKE_TOKEN_43 =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // 43 chars base64url-safe

describe("session-service — createSession (F05-T01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
    (prisma.session.create as any).mockImplementation(
      async ({
        data,
      }: {
        data: { sessionToken: string; userId: string; expires: Date };
      }) => ({
        id: "c-session-id",
        ...data,
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("genera un token base64url de 32 bytes (43 caracteres, ≥43)", async () => {
    const { sessionToken } = await createSession("user_1");

    expect(typeof sessionToken).toBe("string");
    expect(sessionToken.length).toBeGreaterThanOrEqual(43);
    // Formato base64url: sin "+", "/" ni "=" (padding eliminado)
    expect(sessionToken).toMatch(/^[A-Za-z0-9_-]+$/);
    // Decodifica exactamente a 32 bytes
    expect(Buffer.from(sessionToken, "base64url").length).toBe(32);
  });

  it("genera tokens distintos en cada llamada (entropía criptográfica)", async () => {
    const a = await createSession("user_1");
    const b = await createSession("user_1");
    expect(a.sessionToken).not.toBe(b.sessionToken);
  });

  it("expira exactamente a 30 días desde ahora", async () => {
    const { expires } = await createSession("user_1");
    expect(expires.getTime()).toBe(
      new Date("2026-11-13T12:00:00Z").getTime() + THIRTY_DAYS_MS,
    );
  });

  it("persiste la sesión en prisma.session con token, userId y expires", async () => {
    const { sessionToken, expires } = await createSession("user_abc");

    expect(prisma.session.create).toHaveBeenCalledTimes(1);
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        sessionToken,
        userId: "user_abc",
        expires,
      },
    });
  });

  it("devuelve el mismo token y expiración persistidos", async () => {
    const result = await createSession("user_1");
    expect(result.sessionToken).toBeTruthy();
    expect(result.expires).toBeInstanceOf(Date);
  });
});

describe("session-service — deleteSession (idempotente)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("elimina la sesión por token vía deleteMany", async () => {
    (prisma.session.deleteMany as any).mockResolvedValue({ count: 1 });

    await deleteSession(FAKE_TOKEN_43);

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { sessionToken: FAKE_TOKEN_43 },
    });
  });

  it("es idempotente: no falla cuando el token no existe (count 0)", async () => {
    (prisma.session.deleteMany as any).mockResolvedValue({ count: 0 });

    await expect(deleteSession("token-inexistente")).resolves.toBeUndefined();
    expect(prisma.session.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("no lanza error si la eliminación se repite dos veces", async () => {
    (prisma.session.deleteMany as any).mockResolvedValue({ count: 0 });

    await deleteSession(FAKE_TOKEN_43);
    await expect(deleteSession(FAKE_TOKEN_43)).resolves.toBeUndefined();
    expect(prisma.session.deleteMany).toHaveBeenCalledTimes(2);
  });
});

describe("session-service — validateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve el userId cuando la sesión existe y no expiró", async () => {
    (prisma.session.findUnique as any).mockResolvedValue({
      userId: "user_1",
      expires: new Date("2026-12-13T12:00:00Z"), // futuro
    });

    const userId = await validateSession(FAKE_TOKEN_43);
    expect(userId).toBe("user_1");
    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { sessionToken: FAKE_TOKEN_43 },
      select: { userId: true, expires: true },
    });
  });

  it("devuelve null cuando la sesión no existe", async () => {
    (prisma.session.findUnique as any).mockResolvedValue(null);

    expect(await validateSession("desconocido")).toBeNull();
  });

  it("devuelve null cuando la sesión expiró", async () => {
    (prisma.session.findUnique as any).mockResolvedValue({
      userId: "user_1",
      expires: new Date("2026-11-01T12:00:00Z"), // pasado
    });

    expect(await validateSession(FAKE_TOKEN_43)).toBeNull();
  });
});
