// tests/unit/dashboard-auth/reset-password-page.test.tsx
// Pruebas de UI para la página /reset-password (F04-T03).
// Consume POST /api/auth/reset-password (token + nueva contraseña).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";

type MockFetch = ReturnType<typeof vi.fn>;
const mockFetch = vi.fn() as unknown as MockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Página /reset-password (POST /api/auth/reset-password)", () => {
  it("precarga el token cuando se pasa por prop initialToken", () => {
    render(<ResetPasswordPage initialToken="tok_abc123" />);

    expect(screen.getByLabelText(/token de restablecimiento/i)).toHaveValue("tok_abc123");
  });

  it("envía token y contraseña a POST /api/auth/reset-password", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        message: "Si el token era válido, la contraseña se ha actualizado correctamente",
      }),
    } as unknown as Response);

    render(<ResetPasswordPage initialToken="tok_abc123" />);

    const password = screen.getByLabelText(/nueva contraseña/i);
    fireEvent.change(password, { target: { value: "NuevaPass123" } });
    fireEvent.click(screen.getByRole("button", { name: /restablecer contraseña/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body));
    expect(body.token).toBe("tok_abc123");
    expect(body.password).toBe("NuevaPass123");
  });

  it("muestra el mensaje de confirmación no enumerador de la API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        message: "Si el token era válido, la contraseña se ha actualizado correctamente",
      }),
    } as unknown as Response);

    render(<ResetPasswordPage />);

    const token = screen.getByLabelText(/token de restablecimiento/i);
    const password = screen.getByLabelText(/nueva contraseña/i);
    fireEvent.change(token, { target: { value: "tok_xyz" } });
    fireEvent.change(password, { target: { value: "NuevaPass123" } });
    fireEvent.click(screen.getByRole("button", { name: /restablecer contraseña/i }));

    await waitFor(() => {
      expect(screen.getByText(/si el token era válido/i)).toBeInTheDocument();
    });
  });

  it("rechaza contraseñas menores a 8 caracteres sin consultar la API", async () => {
    render(<ResetPasswordPage />);

    const token = screen.getByLabelText(/token de restablecimiento/i);
    const password = screen.getByLabelText(/nueva contraseña/i);
    fireEvent.change(token, { target: { value: "tok_xyz" } });
    fireEvent.change(password, { target: { value: "corta" } });

    fireEvent.click(screen.getByRole("button", { name: /restablecer contraseña/i }));

    expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
