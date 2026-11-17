import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleDashboard } from "../../../src/app/api/dashboard/route";

// Mock del módulo session (requiere sesión activa)
vi.mock("../../../src/lib/session", () => ({
  getSessionUserId: vi.fn(),
}));

// Mock del módulo settings-service (para obtener umbrales)
vi.mock("../../../src/services/settings-service", () => ({
  getUserSettings: vi.fn(),
}));

// Mock del módulo dashboard-service
vi.mock("../../../src/services/dashboard-service", () => ({
  getDashboardMetrics: vi.fn(),
}));

import { getSessionUserId } from "../../../src/lib/session";
import { getUserSettings } from "../../../src/services/settings-service";
import { getDashboardMetrics } from "../../../src/services/dashboard-service";

const NOW = new Date("2026-11-12T10:00:00Z");

function mockRequest(): Request {
  return new Request("http://localhost/api/dashboard", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers().setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/dashboard (métricas + staleness por UserSettings)", () => {
  it("devuelve 401 cuando no hay sesión activa", async () => {
    (vi.mocked(getSessionUserId) as any).mockResolvedValue(null);

    const res = await handleDashboard(mockRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("devuelve métricas del dashboard con staleness por UserSettings del usuario", async () => {
    (vi.mocked(getSessionUserId) as any).mockResolvedValue("u1");
    (vi.mocked(getUserSettings) as any).mockResolvedValue({
      prospectionStalenessDays: 5,
      proposalStalenessDays: 3,
      executionStalenessDays: 2,
      billingStalenessDays: 10,
      closedStalenessDays: 30,
      notificationEnabled: true,
    });
    (vi.mocked(getDashboardMetrics) as any).mockResolvedValue({
      pipelineValue: 15000,
      conversionRate: 40,
      activeDeals: 3,
      staleDeals: [],
    });

    const res = await handleDashboard(mockRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({
      pipelineValue: 15000,
      conversionRate: 40,
      activeDeals: 3,
      staleDeals: [],
    });
    expect(getDashboardMetrics).toHaveBeenCalledWith("u1", {
      prospectionStalenessDays: 5,
      proposalStalenessDays: 3,
      executionStalenessDays: 2,
      billingStalenessDays: 10,
      closedStalenessDays: 30,
    });
  });

  it("pasa los umbrales de UserSettings al servicio de dashboard (ADR-003)", async () => {
    (vi.mocked(getSessionUserId) as any).mockResolvedValue("u2");
    (vi.mocked(getUserSettings) as any).mockResolvedValue({
      prospectionStalenessDays: 14,
      proposalStalenessDays: 7,
      executionStalenessDays: 5,
      billingStalenessDays: 30,
      closedStalenessDays: 60,
      notificationEnabled: false,
    });
    (vi.mocked(getDashboardMetrics) as any).mockResolvedValue({
      pipelineValue: 0,
      conversionRate: 0,
      activeDeals: 0,
      staleDeals: [],
    });

    await handleDashboard(mockRequest());

    expect(getDashboardMetrics).toHaveBeenCalledWith("u2", {
      prospectionStalenessDays: 14,
      proposalStalenessDays: 7,
      executionStalenessDays: 5,
      billingStalenessDays: 30,
      closedStalenessDays: 60,
    });
  });
});
