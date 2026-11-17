// tests/unit/dashboard-auth/register-form.test.tsx
// Pruebas de UI para RegisterForm (F04-T03, ciclo RED → GREEN → REFACTOR).
// Campos: nombre, email, contraseña (≥ 8 caracteres). Accesible.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RegisterForm } from "@/components/auth/register-form";

describe("RegisterForm (accesible, validación visual)", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
  });

  it("renderiza labels asociados a nombre, email y contraseña", () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear cuenta/i })).toBeInTheDocument();
  });

  it("los tres campos son obligatorios y tienen ARIA labels", () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);

    const name = screen.getByLabelText(/nombre completo/i);
    const email = screen.getByLabelText(/correo electrónico/i);
    const password = screen.getByLabelText(/contraseña/i);

    expect(name).toHaveAttribute("required", "");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("aria-required", "true");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("aria-required", "true");
  });

  it("da foco al campo de nombre al montar", () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/nombre completo/i)).toHaveFocus();
  });

  it("muestra errores de campo al enviar sin datos y no llama onSubmit", async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña menor a 8 caracteres con mensaje específico", async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);

    const name = screen.getByLabelText(/nombre completo/i);
    const email = screen.getByLabelText(/correo electrónico/i);
    const password = screen.getByLabelText(/contraseña/i);
    fireEvent.change(name, { target: { value: "Ana García" } });
    fireEvent.change(email, { target: { value: "ana@example.com" } });
    fireEvent.change(password, { target: { value: "corta" } });

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("rechaza un email con formato inválido", async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);

    const name = screen.getByLabelText(/nombre completo/i);
    const email = screen.getByLabelText(/correo electrónico/i);
    const password = screen.getByLabelText(/contraseña/i);
    fireEvent.change(name, { target: { value: "Ana García" } });
    fireEvent.change(email, { target: { value: "no-es-un-email" } });
    fireEvent.change(password, { target: { value: "valida1234" } });

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(screen.getByText(/correo electrónico inválido/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("llama onSubmit con nombre, email y contraseña cuando el formulario es válido", async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);

    const name = screen.getByLabelText(/nombre completo/i);
    const email = screen.getByLabelText(/correo electrónico/i);
    const password = screen.getByLabelText(/contraseña/i);
    fireEvent.change(name, { target: { value: "Ana García" } });
    fireEvent.change(email, { target: { value: "ana@example.com" } });
    fireEvent.change(password, { target: { value: "valida1234" } });

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await vi.waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Ana García",
        email: "ana@example.com",
        password: "valida1234",
      });
    });
  });

  it("asocia mensajes de error con aria-describedby a los campos", () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    const password = screen.getByLabelText(/contraseña/i);
    expect(password).toHaveAttribute("aria-describedby", "register-password-error");
  });

  it("muestra el mensaje de error de la API cuando se recibe uno", () => {
    render(<RegisterForm onSubmit={mockOnSubmit} error="El correo ya está registrado" />);

    expect(screen.getByText(/ya está registrado/i)).toBeInTheDocument();
  });

  it("deshabilita el botón mientras está cargando", () => {
    render(<RegisterForm onSubmit={mockOnSubmit} loading={true} />);

    expect(screen.getByRole("button", { name: /crear cuenta/i })).toBeDisabled();
  });
});
