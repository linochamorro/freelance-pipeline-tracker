// tests/unit/dashboard-auth/reset-password-form.test.tsx
// Pruebas de UI para ResetPasswordForm (F04-T03, ciclo RED → GREEN → REFACTOR).
// Token + nueva contraseña (≥ 8 caracteres). Accesible.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

describe("ResetPasswordForm (accesible, validación visual)", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
  });

  it("renderiza labels asociados a token y nueva contraseña", () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/token de restablecimiento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restablecer contraseña/i })).toBeInTheDocument();
  });

  it("el campo de token y el de contraseña son obligatorios", () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} />);

    const token = screen.getByLabelText(/token de restablecimiento/i);
    const password = screen.getByLabelText(/nueva contraseña/i);

    expect(token).toHaveAttribute("required", "");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("aria-required", "true");
  });

  it("da foco al campo de token al montar", () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/token de restablecimiento/i)).toHaveFocus();
  });

  it("precarga el token cuando se pasa por prop initialToken", () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} initialToken="tok_abc123" />);

    const token = screen.getByLabelText(/token de restablecimiento/i);
    expect(token).toHaveValue("tok_abc123");
  });

  it("muestra errores al enviar sin datos y no llama onSubmit", async () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /restablecer contraseña/i }));

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña menor a 8 caracteres", async () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} />);

    const token = screen.getByLabelText(/token de restablecimiento/i);
    const password = screen.getByLabelText(/nueva contraseña/i);
    fireEvent.change(token, { target: { value: "tok_abc123" } });
    fireEvent.change(password, { target: { value: "corta" } });

    fireEvent.click(screen.getByRole("button", { name: /restablecer contraseña/i }));

    expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("llama onSubmit con token y contraseña cuando el formulario es válido", async () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} />);

    const token = screen.getByLabelText(/token de restablecimiento/i);
    const password = screen.getByLabelText(/nueva contraseña/i);
    fireEvent.change(token, { target: { value: "tok_abc123" } });
    fireEvent.change(password, { target: { value: "NuevaPass123" } });

    fireEvent.click(screen.getByRole("button", { name: /restablecer contraseña/i }));

    await vi.waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        token: "tok_abc123",
        password: "NuevaPass123",
      });
    });
  });

  it("asocia mensajes de error con aria-describedby a los campos", () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /restablecer contraseña/i }));

    const password = screen.getByLabelText(/nueva contraseña/i);
    expect(password).toHaveAttribute("aria-describedby", "reset-password-error");
  });

  it("muestra el mensaje de error de la API cuando se recibe uno", () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} error="Token inválido o expirado" />);

    expect(screen.getByText(/token inválido o expirado/i)).toBeInTheDocument();
  });

  it("deshabilita el botón mientras está cargando", () => {
    render(<ResetPasswordForm onSubmit={mockOnSubmit} loading={true} />);

    expect(screen.getByRole("button", { name: /restablecer contraseña/i })).toBeDisabled();
  });
});
