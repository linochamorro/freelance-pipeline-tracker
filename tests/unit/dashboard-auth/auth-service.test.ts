import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";

// Mock de PrismaClient antes de importar el servicio
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  })),
}));

import { prisma } from "../../../src/services/auth-service";
import { registerUser } from "../../../src/services/auth-service";

const mockUser = {
  id: "c1234567890123456789012345",
  name: "Juan Pérez",
  email: "juan@example.com",
  passwordHash: "$2a$12$hashedpasswordhash",
  emailVerified: null,
  image: null,
  createdAt: new Date("2026-11-12T10:00:00Z"),
  updatedAt: new Date("2026-11-12T10:00:00Z"),
};

describe("auth-service — registro de usuario con bcrypt (F04-T01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Espiar bcrypt.hash para controlar su comportamiento en tests
    vi.spyOn(bcrypt as any, "hash").mockResolvedValue("hashed-password-mock");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("debe crear un usuario con la contraseña hasheada por bcrypt", async () => {
    (prisma.user.create as any).mockResolvedValue(mockUser);

    const result = await registerUser({
      name: "Juan Pérez",
      email: "juan@example.com",
      password: "password123",
    });

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Juan Pérez",
        email: "juan@example.com",
        passwordHash: "hashed-password-mock",
      },
    });
    expect(result).toEqual(mockUser);
  });

  it("debe aceptar nombre opcional (null cuando no se proporciona)", async () => {
    (prisma.user.create as any).mockResolvedValue({
      ...mockUser,
      name: null,
    });

    const result = await registerUser({
      name: null,
      email: "ana@example.com",
      password: "securepass",
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: null,
        email: "ana@example.com",
        passwordHash: "hashed-password-mock",
      },
    });
    expect(result.name).toBeNull();
  });

  it("debe propagar el error de Prisma si el email ya existe", async () => {
    const duplicateError = new Error("Unique constraint failed on email");
    (prisma.user.create as any).mockRejectedValue(duplicateError);

    await expect(
      registerUser({
        name: "Duplicado",
        email: "juan@example.com",
        password: "password123",
      }),
    ).rejects.toThrow("Unique constraint failed on email");
  });
});
