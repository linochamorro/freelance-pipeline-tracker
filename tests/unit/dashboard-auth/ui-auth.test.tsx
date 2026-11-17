// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "../../../src/components/auth/login-form";
import { RegisterForm } from "../../../src/components/auth/register-form";
import { ResetPasswordForm } from "../../../src/components/auth/reset-password-form";

describe("UI de Auth — accesibilidad y validación visual (F04-T03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LoginForm", () => {
    it("renderiza campos accesibles con labels asociados", () => {
      render(<LoginForm onSubmit={vi.fn()} />);
      expect(screen.getByLabelText("Correo electrónico")).toBeTruthy();
      expect(screen.getByLabelText("Contraseña")).toBeTruthy();
    });

    it("muestra error visual cuando el email está vacío", async () => {
      const onSubmit = vi.fn();
      render(<LoginForm onSubmit={onSubmit} />);
      fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
      await waitFor(() => {
        expect(
          screen.getByText("El correo electrónico es obligatorio"),
        ).toBeTruthy();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("muestra error visual para email con formato inválido", async () => {
      render(<LoginForm onSubmit={vi.fn()} />);
      fireEvent.change(screen.getByLabelText("Correo electrónico"), {
        target: { value: "no-es-email" },
      });
      fireEvent.change(screen.getByLabelText("Contraseña"), {
        target: { value: "secreta123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
      await waitFor(() => {
        expect(screen.getByText("Correo electrónico inválido")).toBeTruthy();
      });
    });

    it("envía datos válidos al callback onSubmit", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<LoginForm onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText("Correo electrónico"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Contraseña"), {
        target: { value: "secreta123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "secreta123",
        });
      });
    });
  });

  describe("RegisterForm", () => {
    it("renderiza campos accesibles (nombre, email, contraseña)", () => {
      render(<RegisterForm onSubmit={vi.fn()} />);
      expect(screen.getByLabelText("Nombre completo")).toBeTruthy();
      expect(screen.getByLabelText("Correo electrónico")).toBeTruthy();
      expect(screen.getByLabelText("Contraseña")).toBeTruthy();
    });

    it("exige contraseña de al menos 8 caracteres", async () => {
      const onSubmit = vi.fn();
      render(<RegisterForm onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText("Nombre completo"), {
        target: { value: "Ana Pérez" },
      });
      fireEvent.change(screen.getByLabelText("Correo electrónico"), {
        target: { value: "ana@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Contraseña"), {
        target: { value: "corta" },
      });
      fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
      await waitFor(() => {
        expect(
          screen.getByText("La contraseña debe tener al menos 8 caracteres"),
        ).toBeTruthy();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("envía datos válidos al callback onSubmit", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<RegisterForm onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText("Nombre completo"), {
        target: { value: "Ana Pérez" },
      });
      fireEvent.change(screen.getByLabelText("Correo electrónico"), {
        target: { value: "ana@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Contraseña"), {
        target: { value: "secreta123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: "Ana Pérez",
          email: "ana@example.com",
          password: "secreta123",
        });
      });
    });
  });

  describe("ResetPasswordForm", () => {
    it("renderiza campos accesibles (token, nueva contraseña)", () => {
      render(<ResetPasswordForm onSubmit={vi.fn()} />);
      expect(screen.getByLabelText("Token de restablecimiento")).toBeTruthy();
      expect(screen.getByLabelText("Nueva contraseña")).toBeTruthy();
    });

    it("exige token obligatorio con mensaje visual", async () => {
      const onSubmit = vi.fn();
      render(<ResetPasswordForm onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
        target: { value: "secreta123" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /restablecer contraseña/i }),
      );
      await waitFor(() => {
        expect(
          screen.getByText("El token de restablecimiento es obligatorio"),
        ).toBeTruthy();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("acepta token precargado vía initialToken", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <ResetPasswordForm onSubmit={onSubmit} initialToken="token-precargado" />,
      );
      fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
        target: { value: "secreta123" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /restablecer contraseña/i }),
      );
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          token: "token-precargado",
          password: "secreta123",
        });
      });
    });
  });
});
