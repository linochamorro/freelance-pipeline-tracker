// tests/unit/dashboard-auth/login-form.test.tsx
// Pruebas de UI para LoginForm (F04-T03, ciclo RED → GREEN → REFACTOR).
// Accesibilidad: labels asociados, ARIA, focus y mensajes de error.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginForm } from "@/components/auth/login-form";

describe("LoginForm (accesible, validación visual)", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza el formulario con labels asociados a email y contraseña", () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it("el campo de email tiene tipo email, es obligatorio y tiene ARIA label", () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const email = screen.getByLabelText(/correo electrónico/i);
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("required", "");
    expect(email).toHaveAttribute("aria-required", "true");
  });

  it("el campo de contraseña es de tipo password y obligatorio", () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const password = screen.getByLabelText(/contraseña/i);
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("required", "");
    expect(password).toHaveAttribute("aria-required", "true");
  });

  it("da foco al campo de email al montar", () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/correo electrónico/i)).toHaveFocus();
  });

  it("muestra errores de campo al enviar sin datos y no llama onSubmit", async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("asocia cada mensaje de error con su campo mediante aria-describedby", () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    const email = screen.getByLabelText(/correo electrónico/i);
    expect(email).toHaveAttribute("aria-describedby", "login-email-error");

    const password = screen.getByLabelText(/contraseña/i);
    expect(password).toHaveAttribute("aria-describedby", "login-password-error");
  });

  it("rechaza un email con formato inválido", async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const email = screen.getByLabelText(/correo electrónico/i);
    fireEvent.change(email, { target: { value: "no-es-un-email" } });
    const password = screen.getByLabelText(/contraseña/i);
    fireEvent.change(password, { target: { value: "password123" } });

    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(screen.getByText(/correo electrónico inválido/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("llama onSubmit con email y contraseña cuando el formulario es válido", async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const email = screen.getByLabelText(/correo electrónico/i);
    const password = screen.getByLabelText(/contraseña/i);
    fireEvent.change(email, { target: { value: "usuaria@example.com" } });
    fireEvent.change(password, { target: { value: "Segura1234" } });

    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await vi.waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: "usuaria@example.com",
        password: "Segura1234",
      });
    });
  });

  it("limpia el error de un campo al escribir en él tras un envío fallido", async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    const email = screen.getByLabelText(/correo electrónico/i);
    expect(email).toHaveAttribute("aria-describedby", "login-email-error");

    fireEvent.change(email, { target: { value: "a@b.co" } });
    expect(email).not.toHaveAttribute("aria-describedby");
  });

  it("muestra el mensaje de error de la API cuando se recibe uno", () => {
    render(<LoginForm onSubmit={mockOnSubmit} error="Credenciales inválidas" />);

    expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
  });

  it("deshabilita el botón mientras está cargando", () => {
    render(<LoginForm onSubmit={mockOnSubmit} loading={true} />);

    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeDisabled();
  });
});
