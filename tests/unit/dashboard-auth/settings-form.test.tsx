// tests/unit/dashboard-auth/settings-form.test.tsx
// Pruebas de UI para SettingsForm (F04-T03, ciclo RED → GREEN → REFACTOR).
// Umbrales de inactividad por etapa (1-365 días). Sin selector de moneda:
// PEN es fijo (M-2/M-3, F05-T01 loop 2/3).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsForm } from "@/components/dashboard/settings-form";
import type { UserSettings } from "@/types";

describe("SettingsForm (accesible, validación visual)", () => {
  const mockOnSubmit = vi.fn();

  const defaultSettings: UserSettings = {
    id: "s1",
    userId: "u1",
    prospectionStalenessDays: 7,
    proposalStalenessDays: 7,
    executionStalenessDays: 7,
    billingStalenessDays: 7,
    closedStalenessDays: 7,
    notificationEnabled: true,
  };

  beforeEach(() => {
    mockOnSubmit.mockReset();
  });

  it("renderiza inputs de umbral por etapa con labels asociados", () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/prospectaci[oó]n \(días\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/propuesta \(días\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ejecuci[oó]n \(días\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/facturaci[oó]n \(días\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cerrado \(días\)/i)).toBeInTheDocument();
  });

  it("cada input de umbral es numérico, entre 1 y 365 días", () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} />);

    const prospection = screen.getByLabelText(/prospectaci[oó]n \(días\)/i);
    expect(prospection).toHaveAttribute("type", "number");
    expect(prospection).toHaveAttribute("min", "1");
    expect(prospection).toHaveAttribute("max", "365");
    expect(prospection).toHaveValue(7);
  });

  it("no renderiza selector de moneda (PEN es fijo y no configurable)", () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} />);

    // M-3 (F05-T01 loop 2/3): la moneda es PEN fija; no hay selector.
    expect(screen.queryByLabelText(/moneda/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText("USD")).not.toBeInTheDocument();
    expect(screen.queryByText("EUR")).not.toBeInTheDocument();
    expect(screen.queryByText("PEN")).not.toBeInTheDocument();
  });

  it("renderiza el interruptor de notificaciones", () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} />);

    const toggle = screen.getByRole("checkbox", { name: /activar notificaciones/i });
    expect(toggle).toBeChecked();
  });

  it("muestra errores al enviar con días fuera de rango y no llama onSubmit", async () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} />);

    const prospection = screen.getByLabelText(/prospectaci[oó]n \(días\)/i);
    fireEvent.change(prospection, { target: { value: "400" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar configuraci[oó]n/i }));

    expect(screen.getByText(/máximo 365 días/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("rechaza valores no enteros en los umbrales", async () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} />);

    const proposal = screen.getByLabelText(/propuesta \(días\)/i);
    fireEvent.change(proposal, { target: { value: "7.5" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar configuraci[oó]n/i }));

    expect(screen.getByText(/entero/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("llama onSubmit con los umbrales y sin preferencia de moneda al enviar un formulario válido", async () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} />);

    const prospection = screen.getByLabelText(/prospectaci[oó]n \(días\)/i);
    fireEvent.change(prospection, { target: { value: "14" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar configuraci[oó]n/i }));

    await vi.waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          prospectionStalenessDays: 14,
          notificationEnabled: true,
        }),
      );
    });

    // M-3: el payload ya no viaja ninguna preferencia de moneda.
    const payload = mockOnSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("currency");
  });

  it("asocia mensajes de error con aria-describedby a los campos", () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} />);

    const prospection = screen.getByLabelText(/prospectaci[oó]n \(días\)/i);
    fireEvent.change(prospection, { target: { value: "0" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar configuraci[oó]n/i }));

    expect(prospection).toHaveAttribute("aria-describedby", "settings-prospection-error");
  });

  it("muestra el mensaje de error de la API cuando se recibe uno", () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} error="No se pudo guardar la configuración" />);

    expect(screen.getByText(/no se pudo guardar la configuraci[oó]n/i)).toBeInTheDocument();
  });

  it("deshabilita el botón mientras está cargando", () => {
    render(<SettingsForm settings={defaultSettings} onSubmit={mockOnSubmit} loading={true} />);

    expect(screen.getByRole("button", { name: /guardar configuraci[oó]n/i })).toBeDisabled();
  });
});
