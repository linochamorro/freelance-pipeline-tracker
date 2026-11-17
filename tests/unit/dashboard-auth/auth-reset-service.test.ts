// Entorno "node" (por archivo, F05-T01): el servicio usa randomBytes de
// crypto de Node. En el entorno jsdom por defecto, Vite externaliza el
// módulo nativo "crypto" para navegador y el spy de randomBytes falla
// ("randomBytes does not exist"). Con entorno node el import nativo es real.
// No cambia ninguna lógica de la prueba.

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// Mock de PrismaClient antes de importar el servicio
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    verificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) =>
      fn({
        user: { findUnique: vi.fn(), update: vi.fn() },
        session: { deleteMany: vi.fn() },
        verificationToken: { findUnique: vi.fn(), deleteMany: vi.fn() },
      }),
    ),
  })),
}));

// bcrypt real (node env) para que consumePasswordResetToken genere hash válido.

import { prisma } from "../../../src/services/auth-reset-service";
import { requestPasswordReset, consumePasswordResetToken } from "../../../src/services/auth-reset-service";

// Espiar crypto.randomBytes para hacer el token predecible en tests
const originalRandomBytes = crypto.randomBytes;

describe("auth-reset-service — reset de contraseña no enumerador (F04-T01, ADR-006)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Hacer crypto.randomBytes predecible
    vi.spyOn(crypto, "randomBytes").mockImplementation((size: number) => {
      const buf = Buffer.alloc(size);
      buf.fill(0xab);
      return buf as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("debe generar un token criptográficamente seguro (32+ bytes, base64url) para email existente", async () => {
    const mockUser = {
      id: "c1234567890123456789012345",
      email: "juan@example.com",
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.verificationToken.create as any).mockResolvedValue({
      identifier: "juan@example.com",
      token: "mock-token",
      expires: new Date(Date.now() + 3600000),
    });

    const result = await requestPasswordReset("juan@example.com");

    expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    expect(prisma.verificationToken.create).toHaveBeenCalledWith({
      data: {
        identifier: "juan@example.com",
        token: expect.any(String),
        expires: expect.any(Date),
      },
    });
    expect(result.message).toBe(
      "Si el correo está registrado, recibirás un enlace de restablecimiento",
    );
  });

  it("debe responder idénticamente para email inexistente (no enumeración)", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.verificationToken.create as any).mockResolvedValue({});

    const result = await requestPasswordReset("noexiste@example.com");

    expect(prisma.verificationToken.create).not.toHaveBeenCalled();
    expect(result.message).toBe(
      "Si el correo está registrado, recibirás un enlace de restablecimiento",
    );
  });

  it("el token debe tener al menos 32 bytes cuando se decodifica desde base64url", async () => {
    const mockUser = { id: "c1", email: "test@example.com" };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.verificationToken.create as any).mockImplementation((args: any) => {
      expect(args.data.token.length).toBeGreaterThanOrEqual(43); // 32 bytes → ~43 chars base64url
      return Promise.resolve(args.data);
    });

    await requestPasswordReset("test@example.com");

    // Verificar que randomBytes se llamó con 32
    expect(crypto.randomBytes).toHaveBeenCalledWith(32);
  });

  it("debe establecer expiración de 1 hora en el token", async () => {
    const mockUser = { id: "c1", email: "test@example.com" };
    const before = Date.now();
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.verificationToken.create as any).mockImplementation((args: any) => {
      const diffMs = args.data.expires.getTime() - before;
      expect(diffMs).toBeGreaterThanOrEqual(3599000); // ~1 hora
      expect(diffMs).toBeLessThanOrEqual(3601000);
      return Promise.resolve(args.data);
    });

    await requestPasswordReset("test@example.com");
  });

  it("debe aplicar retardo uniforme independientemente de si el email existe", async () => {
    const delaySpy = vi.spyOn(global, "setTimeout");

    (prisma.user.findUnique as any).mockResolvedValue(null);
    await requestPasswordReset("noexiste@example.com");
    expect(delaySpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));

    delaySpy.mockClear();
    (prisma.user.findUnique as any).mockResolvedValue({ id: "c1" });
    (prisma.verificationToken.create as any).mockResolvedValue({});
    await requestPasswordReset("existe@example.com");
    expect(delaySpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
  });
});

describe("auth-reset-service — H-3 consumePasswordResetToken (reclamo atómico)", () => {
  it("consume token válido, actualiza contraseña e invalida todas las sesiones del usuario en una transacción", async () => {
    const tx = {
      verificationToken: {
        findUnique: vi.fn().mockResolvedValue({ identifier: "user@example.com", expires: new Date(Date.now() + 3600000) }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "u1" }),
        update: vi.fn().mockResolvedValue({ id: "u1" }),
      },
      session: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(tx));

    await consumePasswordResetToken("token-valido", "NuevaPass123");

    expect(tx.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { token: "token-valido", expires: { gt: expect.any(Date) } },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: expect.anything() },
    });
    const updateArg = (tx.user.update as any).mock.calls[0][0];
    expect(updateArg.data.passwordHash == null).toBe(false);
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });

  it("token sin usuario: se consume (deleteMany count==1) sin actualizar contraseña ni borrar sesiones", async () => {
    const tx = {
      verificationToken: {
        findUnique: vi.fn().mockResolvedValue({ identifier: "nadie@example.com", expires: new Date(Date.now() + 3600000) }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      session: {
        deleteMany: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(tx));

    await expect(consumePasswordResetToken("token-sin-user", "NuevaPass123")).resolves.toBeUndefined();
    expect(tx.verificationToken.deleteMany).toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });

  it("reuso/carrera perdida: deleteMany count!=1 no muta contraseña ni sesiones y no lanza", async () => {
    const tx = {
      verificationToken: {
        findUnique: vi.fn().mockResolvedValue({ identifier: "user@example.com", expires: new Date(Date.now() + 3600000) }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      user: { findUnique: vi.fn(), update: vi.fn() },
      session: { deleteMany: vi.fn() },
    };
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(tx));

    await expect(consumePasswordResetToken("token-reusado", "NuevaPass123")).resolves.toBeUndefined();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });
});
