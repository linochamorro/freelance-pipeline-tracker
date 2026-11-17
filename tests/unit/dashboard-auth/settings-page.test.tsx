// tests/unit/dashboard-auth/settings-page.test.tsx
// Pruebas de UI para la página /settings (F04-T03).
// Consume GET/PUT /api/settings.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/(dashboard)/settings/page";

type MockFetch = ReturnType<typeof vi.fn>;
const mockFetch = vi.fn() as unknown as MockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const settingsBody = {
  success: true,
  data: {
    id: "s1",
    userId: "u1",
    prospectionStalenessDays: 7,
    proposalStalenessDays: 7,
    executionStalenessDays: 7,
    billingStalenessDays: 7,
    closedStalenessDays: 7,
    notificationEnabled: true,
  },
};

describe("Página /settings (GET/PUT /api/settings)", () => {
  it("carga la configuración con GET /api/settings y la muestra en el formulario", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => settingsBody,
    } as unknown as Response);

    render(<SettingsPage />);

    const prospection = await screen.findByLabelText(/prospectaci[oó]n \(días\)/i);
    expect(prospection).toHaveValue(7);
    expect(mockFetch).toHaveBeenCalledWith("/api/settings");
  });

  it("envía PUT /api/settings con los umbrales actualizados y muestra confirmación", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => settingsBody,
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { ...settingsBody.data, prospectionStalenessDays: 14 },
        }),
      } as unknown as Response);

    render(<SettingsPage />);

    const prospection = await screen.findByLabelText(/prospectaci[oó]n \(días\)/i);
    expect(prospection).toHaveValue(7);

    fireEvent.change(prospection, { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar configuraci[oó]n/i }));

    await waitFor(() => {
      expect(screen.getByText(/configuraci[oó]n guardada/i)).toBeInTheDocument();
    });

    const putCalls = mockFetch.mock.calls.filter(
      (call: any[]) => String(call[0]).endsWith("/api/settings") && call[1]?.method === "PUT",
    );
    expect(putCalls.length).toBe(1);
    const body = JSON.parse(String(putCalls[0][1]?.body));
    expect(body.prospectionStalenessDays).toBe(14);
    // El contrato SettingsUpdateSchema exige el id de UserSettings; sin él la
    // API real responde 400 VALIDATION_ERROR y el usuario nunca puede guardar.
    expect(body.id).toBe("s1");
    // M-3 (F05-T01 loop 2/3): el PUT no debe enviar preferencia de moneda.
    expect(body).not.toHaveProperty("currency");
    // La segunda llamada a /api/settings es el PUT (sin opciones en esta implementación)
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    expect(String(lastCall[0])).toBe("/api/settings");
  });

  it("muestra error de validación cuando la API responde 400", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => settingsBody,
    } as unknown as Response);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Datos de configuración inválidos" },
      }),
    } as unknown as Response);

    render(<SettingsPage />);

    const prospection = await screen.findByLabelText(/prospectaci[oó]n \(días\)/i);
    expect(prospection).toHaveValue(7);

    // 14 es válido localmente (1-365) pero la API responderá 400
    fireEvent.change(prospection, { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar configuraci[oó]n/i }));

    await waitFor(() => {
      expect(screen.getByText(/datos de configuraci[oó]n inválidos/i)).toBeInTheDocument();
    });
  });

  it("muestra error cuando la lectura de configuración falla", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: "UNAUTHORIZED", message: "Sesión requerida" } }),
    } as unknown as Response);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/sesión requerida/i)).toBeInTheDocument();
    });
  });
});
