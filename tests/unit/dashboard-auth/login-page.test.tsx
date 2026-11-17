// tests/unit/dashboard-auth/login-page.test.tsx
// Pruebas de UI para la página /login (F04-T03 + wiring real F05-T01).
// Cobertura: props controladas (onLogin/loading/error) y wiring por defecto
// contra POST /api/auth/login (éxito, 401 y error de red).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

const router = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const fetchMock = vi.fn();

beforeEach(() => {
  router.push.mockReset();
  router.refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Página /login — props controladas (F04-T03)", () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    mockOnLogin.mockReset();
  });

  it("renderiza el formulario de login accesible", () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it("muestra errores de validación al enviar vacío y no llama onLogin", async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(2);
    expect(mockOnLogin).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("llama onLogin con email y contraseña al enviar válido", async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    const email = screen.getByLabelText(/correo electrónico/i);
    const password = screen.getByLabelText(/contraseña/i);
    fireEvent.change(email, { target: { value: "usuaria@example.com" } });
    fireEvent.change(password, { target: { value: "Segura1234" } });

    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({
        email: "usuaria@example.com",
        password: "Segura1234",
      });
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de error de autenticación cuando se recibe uno", () => {
    render(<LoginPage onLogin={mockOnLogin} error="Credenciales inválidas" />);

    expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
  });
});

describe("Página /login — wiring real por defecto (F05-T01)", () => {
  const fillValidCredentials = () => {
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: "usuaria@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "Segura1234" },
    });
  };

  it("envía POST /api/auth/login sin identidad del cliente y navega a /", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: "u1", name: "Usuaria", email: "usuaria@example.com" },
      }),
    });
    render(<LoginPage />);

    fillValidCredentials();
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/");
    });
    expect(router.refresh).toHaveBeenCalled();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(init.method).toBe("POST");
    expect(JSON.stringify(init.body)).toContain("usuaria@example.com");
    expect(JSON.stringify(init.headers ?? {})).not.toContain("x-user-id");
  });

  it("muestra 'Credenciales inválidas' en 401 y no navega", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Credenciales inválidas" },
      }),
    });
    render(<LoginPage />);

    fillValidCredentials();
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("muestra el mensaje del servidor en errores distintos de 401", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: { code: "SERVER_ERROR", message: "Error interno" },
      }),
    });
    render(<LoginPage />);

    fillValidCredentials();
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/error interno/i)).toBeInTheDocument();
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("muestra un error genérico si falla la conexión y lo limpia al reintentar", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: "u1" } }),
    });
    render(<LoginPage />);

    fillValidCredentials();
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no se pudo conectar con el servidor/i),
      ).toBeInTheDocument();
    });
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByText(/no se pudo conectar/i)).not.toBeInTheDocument();
  });
});
