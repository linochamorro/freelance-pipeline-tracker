// tests/components/tasks/task-form.test.ts
// Pruebas de componente para TaskForm (RED → GREEN → REFACTOR)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskForm } from "@/components/tasks/task-form";

describe("TaskForm", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
    mockOnSubmit.mockResolvedValue(true);
  });

  it("renderiza todos los campos obligatorios con sus labels", () => {
    render(<TaskForm onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText(/Título de la tarea/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descripción/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha límite/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Adelanto de notificación/)).toBeInTheDocument();
  });

  it("tiene las 5 opciones de adelanto (15, 30, 60, 120, 1440 min)", () => {
    render(<TaskForm onSubmit={mockOnSubmit} />);
    const select = screen.getByLabelText(/Adelanto de notificación/);
    expect(select).toHaveValue("15");
    const options = select.ownerDocument.querySelectorAll("option");
    const values = Array.from(options).map((o) => o.value);
    expect(values).toContain("15");
    expect(values).toContain("30");
    expect(values).toContain("60");
    expect(values).toContain("120");
    expect(values).toContain("1440");
  });

  it("muestra errores de validación cuando se envía sin título ni fecha", async () => {
    render(<TaskForm onSubmit={mockOnSubmit} />);
    const btn = screen.getByRole("button", { name: /Crear tarea/ });
    fireEvent.click(btn);
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("llama onSubmit con datos correctos al enviar un formulario válido", async () => {
    render(<TaskForm onSubmit={mockOnSubmit} />);
    const titleInput = screen.getByLabelText(/Título de la tarea/);
    const descInput = screen.getByLabelText(/Descripción/);
    const dateInput = screen.getByLabelText(/Fecha límite/);
    const leadSelect = screen.getByLabelText(/Adelanto de notificación/);

    fireEvent.change(titleInput, { target: { value: "Revisar contrato" } });
    fireEvent.change(descInput, { target: { value: "Leer cláusulas" } });
    fireEvent.change(dateInput, {
      target: { value: "2026-12-01T10:00" },
    });
    fireEvent.change(leadSelect, { target: { value: "30" } });

    const btn = screen.getByRole("button", { name: /Crear tarea/ });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: "Revisar contrato",
        description: "Leer cláusulas",
        dueDate: new Date("2026-12-01T10:00").toISOString(),
        leadMinutes: 30,
      });
      expect(titleInput).toHaveValue("");
      expect(descInput).toHaveValue("");
      expect(dateInput).toHaveValue("");
      expect(leadSelect).toHaveValue("15");
    });
  });

  it("muestra mensaje de error cuando se recibe error de la API", () => {
    render(<TaskForm onSubmit={mockOnSubmit} error="Error de servidor" />);
    expect(screen.getByText("Error de servidor")).toBeInTheDocument();
  });

  it("deshabilita el botón mientras está cargando", () => {
    render(<TaskForm onSubmit={mockOnSubmit} loading={true} />);
    const btn = screen.getByRole("button", { name: /Creando/ });
    expect(btn).toBeDisabled();
  });

  it("asocia mensajes de error con aria-describedby a los campos", () => {
    render(<TaskForm onSubmit={mockOnSubmit} />);
    const btn = screen.getByRole("button", { name: /Crear tarea/ });
    fireEvent.click(btn);
    const titleInput = screen.getByLabelText(/Título de la tarea/);
    expect(titleInput).toHaveAttribute("aria-describedby", "task-title-error");
  });
});
