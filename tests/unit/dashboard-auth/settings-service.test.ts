import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de PrismaClient antes de importar el servicio
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    userSettings: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  })),
}));

import { prisma } from "../../../src/services/settings-service";
import {
  getUserSettings,
  updateUserSettings,
} from "../../../src/services/settings-service";

describe("settings-service — lectura y actualización de UserSettings (F04-T01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const existingSettings = {
    id: "c1234567890123456789012345",
    userId: "user1",
    prospectionStalenessDays: 7,
    proposalStalenessDays: 7,
    executionStalenessDays: 7,
    billingStalenessDays: 7,
    closedStalenessDays: 7,
    notificationEnabled: true,
  };

  it("debe devolver la configuración existente del usuario", async () => {
    (prisma.userSettings.findUnique as any).mockResolvedValue(existingSettings);

    const result = await getUserSettings("user1");

    expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({
      where: { userId: "user1" },
    });
    expect(result).toEqual(existingSettings);
  });

  it("debe crear configuración con valores por defecto (7 días) si no existe", async () => {
    (prisma.userSettings.findUnique as any).mockResolvedValue(null);
    (prisma.userSettings.create as any).mockResolvedValue(existingSettings);

    const result = await getUserSettings("user-new");

    expect(prisma.userSettings.create).toHaveBeenCalledWith({
      data: {
        userId: "user-new",
        prospectionStalenessDays: 7,
        proposalStalenessDays: 7,
        executionStalenessDays: 7,
        billingStalenessDays: 7,
        closedStalenessDays: 7,
        notificationEnabled: true,
      },
    });
    expect(result).toEqual(existingSettings);
  });

  it("debe actualizar umbrales validados con SettingsUpdateSchema", async () => {
    (prisma.userSettings.findUnique as any).mockResolvedValue(existingSettings);
    (prisma.userSettings.update as any).mockResolvedValue({
      ...existingSettings,
      prospectionStalenessDays: 14,
      notificationEnabled: false,
    });

    const result = await updateUserSettings("user1", {
      id: existingSettings.id,
      prospectionStalenessDays: 14,
      notificationEnabled: false,
    });

    expect(prisma.userSettings.update).toHaveBeenCalledWith({
      where: { userId: "user1" },
      data: {
        prospectionStalenessDays: 14,
        notificationEnabled: false,
      },
    });
    expect(result.prospectionStalenessDays).toBe(14);
    expect(result.notificationEnabled).toBe(false);
  });

  it("debe rechazar datos inválidos (días fuera de rango 1-365)", async () => {
    await expect(
      updateUserSettings("user1", {
        id: existingSettings.id,
        prospectionStalenessDays: 400, // > 365
      }),
    ).rejects.toThrow();

    expect(prisma.userSettings.update).not.toHaveBeenCalled();
  });

  it("debe rechazar datos inválidos (días no enteros)", async () => {
    await expect(
      updateUserSettings("user1", {
        id: existingSettings.id,
        prospectionStalenessDays: 7.5, // no es entero
      }),
    ).rejects.toThrow();

    expect(prisma.userSettings.update).not.toHaveBeenCalled();
  });

  it("debe aceptar actualización parcial (solo algunos campos)", async () => {
    (prisma.userSettings.findUnique as any).mockResolvedValue(existingSettings);
    (prisma.userSettings.update as any).mockResolvedValue({
      ...existingSettings,
      closedStalenessDays: 30,
    });

    const result = await updateUserSettings("user1", {
      id: existingSettings.id,
      closedStalenessDays: 30,
    });

    expect(prisma.userSettings.update).toHaveBeenCalledWith({
      where: { userId: "user1" },
      data: { closedStalenessDays: 30 },
    });
    expect(result.closedStalenessDays).toBe(30);
  });
});
