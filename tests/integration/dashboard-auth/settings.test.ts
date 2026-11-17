import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetSettings, handlePutSettings } from "../../../src/app/api/settings/route";

// Mock del módulo session (requiere sesión activa)
vi.mock("../../../src/lib/session", () => ({
  getSessionUserId: vi.fn(),
}));

// Mock del módulo settings-service
vi.mock("../../../src/services/settings-service", () => ({
  getUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
}));

import { getSessionUserId } from "../../../src/lib/session";
import { getUserSettings, updateUserSettings } from "../../../src/services/settings-service";

function mockRequest(body?: unknown): Request {
  return new Request("http://localhost/api/settings", {
    method: body ? "PUT" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/settings (lectura de UserSettings)", () => {
  it("devuelve 401 cuando no hay sesión activa", async () => {
    (vi.mocked(getSessionUserId) as any).mockResolvedValue(null);

    const res = await handleGetSettings(mockRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("devuelve la configuración del usuario autenticado", async () => {
    (vi.mocked(getSessionUserId) as any).mockResolvedValue("u1");
    (vi.mocked(getUserSettings) as any).mockResolvedValue({
      id: "s1",
      userId: "u1",
      prospectionStalenessDays: 7,
      proposalStalenessDays: 7,
      executionStalenessDays: 7,
      billingStalenessDays: 7,
      closedStalenessDays: 7,
      notificationEnabled: true,
    });

    const res = await handleGetSettings(mockRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.userId).toBe("u1");
    expect(getUserSettings).toHaveBeenCalledWith("u1");
  });
});

describe("PUT /api/settings (actualización de UserSettings)", () => {
  it("devuelve 401 cuando no hay sesión activa", async () => {
    (vi.mocked(getSessionUserId) as any).mockResolvedValue(null);

    const res = await handlePutSettings(mockRequest({ prospectionStalenessDays: 14 }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("actualiza y devuelve la configuración con datos válidos", async () => {
    (vi.mocked(getSessionUserId) as any).mockResolvedValue("u1");
    (vi.mocked(updateUserSettings) as any).mockResolvedValue({
      id: "s1",
      userId: "u1",
      prospectionStalenessDays: 14,
      proposalStalenessDays: 7,
      executionStalenessDays: 7,
      billingStalenessDays: 7,
      closedStalenessDays: 7,
      notificationEnabled: true,
    });

    const res = await handlePutSettings(
      mockRequest({ id: "c1234567890123456789012345", prospectionStalenessDays: 14, notificationEnabled: true }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.prospectionStalenessDays).toBe(14);
    expect(updateUserSettings).toHaveBeenCalledWith("u1", {
      id: "c1234567890123456789012345",
      prospectionStalenessDays: 14,
      notificationEnabled: true,
    });
  });

  it("responde 400 para datos inválidos (días fuera de rango 1-365)", async () => {
    (vi.mocked(getSessionUserId) as any).mockResolvedValue("u1");

    const res = await handlePutSettings(
      mockRequest({ prospectionStalenessDays: 400 }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(updateUserSettings).not.toHaveBeenCalled();
  });

  it("responde 400 para cuerpo no JSON", async () => {
    (vi.mocked(getSessionUserId) as any).mockResolvedValue("u1");

    const req = new Request("http://localhost/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "no-es-json",
    });

    const res = await handlePutSettings(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(updateUserSettings).not.toHaveBeenCalled();
  });
});
