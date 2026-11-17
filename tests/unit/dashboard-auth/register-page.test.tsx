// tests/unit/dashboard-auth/register-page.test.tsx
// Pruebas de UI para la página /register (F04-T03 + wiring real F05-T01).
// Cobertura: props controladas (onRegister/loading/error) y wiring por defecto
// contra POST /api/auth/register (éxito 201, 409 y error de red).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "@/app/(auth)/register/page";

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

describe("Página /register — props controladas (F04-T03)", () => {
  const mockOnRegister = vi.fn();

  beforeEach(() => {
    mockOnRegister.mockReset();
  });

  it("renderiza el formulario de registro accesible", () => {
    render(<RegisterPage onRegister={mockOnRegister} />);

    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear cuenta/i })).toBeInTheDocument();
  });

  it("rechaza contraseñas menores a 8 caracteres y no llama onRegister", async () => {
    render(<RegisterPage onRegister={mockOnRegister} />);

    const name = screen.getByLabelText(/nombre completo/i);
    const email = screen.getByLabelText(/correo electrónico/i);
    const password = screen.getByLabelText(/contraseña/i);
    fireEvent.change(name, { target: { value: "Ana García" } });
    fireEvent.change(email, { target: { value: "ana@example.com" } });
    fireEvent.change(password, { target: { value: "corta" } });

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    expect(mockOnRegister).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("llama onRegister con nombre, email y contraseña al enviar válido", async () => {
    render(<RegisterPage onRegister={mockOnRegister} />);

    const name = screen.getByLabelText(/nombre completo/i);
    const email = screen.getByLabelText(/correo electrónico/i);
    const password = screen.getByLabelText(/contraseña/i);
    fireEvent.change(name, { target: { value: "Ana García" } });
    fireEvent.change(email, { target: { value: "ana@example.com" } });
    fireEvent.change(password, { target: { value: "valida1234" } });

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(mockOnRegister).toHaveBeenCalledWith({
        name: "Ana García",
        email: "ana@example.com",
        password: "valida1234",
      });
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de error de registro cuando se recibe uno", () => {
    render(<RegisterPage onRegister={mockOnRegister} error="El correo ya está registrado" />);

    expect(screen.getByText(/ya está registrado/i)).toBeInTheDocument();
  });
});

describe("Página /register — wiring real por defecto (F05-T01)", () => {
  const fillValidForm = () => {
    fireEvent.change(screen.getByLabelText(/nombre completo/i), {
      target: { value: "Ana García" },
    });
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "valida1234" },
    });
  };

  it("envía POST /api/auth/register sin identidad del cliente y navega a /", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: { id: "u1", name: "Ana García", email: "ana@example.com" },
      }),
    });
    render(<RegisterPage />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/");
    });
    expect(router.refresh).toHaveBeenCalled();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/register");
    expect(init.method).toBe("POST");
    expect(JSON.stringify(init.body)).toContain("ana@example.com");
    expect(JSON.stringify(init.headers ?? {})).not.toContain("x-user-id");
  });

  it("muestra 'Ese correo ya está registrado' en 409 y no navega", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: { code: "EMAIL_IN_USE", message: "Ese correo ya está registrado" },
      }),
    });
    render(<RegisterPage />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/ese correo ya está registrado/i),
      ).toBeInTheDocument();
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("muestra el mensaje del servidor en errores de validación (400)", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Datos inválidos" },
      }),
    });
    render(<RegisterPage />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText(/datos inválidos/i)).toBeInTheDocument();
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("muestra un error genérico si falla la conexión", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<RegisterPage />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no se pudo conectar con el servidor/i),
      ).toBeInTheDocument();
    });
    expect(router.push).not.toHaveBeenCalled();
  });
});
