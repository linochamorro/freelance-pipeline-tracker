// tests/unit/dashboard-auth/dashboard-page.test.tsx
// Pruebas de UI para la página principal / (dashboard) (F04-T03).
// Consume GET /api/dashboard. Estados: carga, éxito, error, vacío.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/page";

type MockFetch = ReturnType<typeof vi.fn>;
const mockFetch = vi.fn() as unknown as MockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockDashboardResponse(data: unknown, status = 200): void {
  mockFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as unknown as Response);
}

describe("Página principal /dashboard (GET /api/dashboard)", () => {
  it("muestra estado de carga mientras consulta la API", async () => {
    let resolveFetch: (value: Response | PromiseLike<Response>) => void = () => {};
    const fetchPromise = new Promise<Response>((res) => {
      resolveFetch = res;
    });
    mockFetch.mockResolvedValue(fetchPromise);

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-loading")).toHaveAttribute("aria-busy", "true");

    resolveFetch(
      new Response(
        JSON.stringify({
          success: true,
          data: { pipelineValue: 0, conversionRate: 0, activeDeals: 0, staleDeals: [] },
        }),
        { status: 200 },
      ),
    );
    await waitFor(() => {
      expect(screen.queryByTestId("dashboard-loading")).not.toBeInTheDocument();
    });
  });

  it("consume GET /api/dashboard y renderiza métricas y lista de deals inactivos", async () => {
    mockDashboardResponse({
      success: true,
      data: {
        pipelineValue: 15000,
        conversionRate: 40,
        activeDeals: 3,
        staleDeals: [
          {
            id: "d1",
            clientName: "Globex",
            pipelineStage: "ProposalSent",
            updatedAt: "2026-11-05T10:00:00Z",
            daysOverdue: 7,
          },
        ],
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("S/. 15,000.00")).toBeInTheDocument();
    });
    expect(screen.getByText(/40%/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/dashboard");
  });

  it("renderiza estado vacío sin deals inactivos", async () => {
    mockDashboardResponse({
      success: true,
      data: { pipelineValue: 0, conversionRate: 0, activeDeals: 0, staleDeals: [] },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("S/. 0.00")).toBeInTheDocument();
    });
    expect(screen.getByText(/no hay deals inactivos/i)).toBeInTheDocument();
  });

  it("muestra error y botón de reintento cuando la API falla", async () => {
    mockDashboardResponse({ success: false, error: { code: "UNAUTHORIZED", message: "Sesión requerida" } }, 401);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/sesión requerida/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("vuelve a consultar la API al hacer clic en reintentar", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: { code: "ERROR", message: "caída" } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { pipelineValue: 9000, conversionRate: 0, activeDeals: 0, staleDeals: [] },
        }),
      } as unknown as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/caída/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

    await waitFor(() => {
      expect(screen.getByText("S/. 9,000.00")).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
