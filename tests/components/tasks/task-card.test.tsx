// tests/components/tasks/task-card.test.ts
// Pruebas de componente para TaskCard (RED → GREEN → REFACTOR)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskCard } from "@/components/tasks/task-card";
import type { Task } from "@/types";

const baseTask = {
  id: "task_1",
  userId: "user_1",
  opportunityId: null,
  title: "Revisar contrato",
  description: "Leer cláusulas de confidencialidad",
  dueDate: new Date(Date.now() + 86400000),
  completed: false,
  leadMinutes: 60,
  createdAt: new Date(),
  updatedAt: new Date(),
  notifications: [],
} as Task;

describe("TaskCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el título, descripción y fecha de la tarea", () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText("Revisar contrato")).toBeInTheDocument();
    expect(screen.getByText(/Leer cláusulas/)).toBeInTheDocument();
    expect(screen.getByText(/60 min adelanto/)).toBeInTheDocument();
  });

  it("tiene rol de listitem", () => {
    render(<TaskCard task={baseTask} />);
    const item = screen.getByRole("listitem");
    expect(item).toBeInTheDocument();
  });

  it("llama onToggleCompleted al hacer clic en el botón de completado", () => {
    const onToggleCompleted = vi.fn();
    render(<TaskCard task={baseTask} onToggleCompleted={onToggleCompleted} />);
    const btn = screen.getByRole("button", {
      name: /Marcar tarea como completada/,
    });
    fireEvent.click(btn);
    expect(onToggleCompleted).toHaveBeenCalledWith("task_1", true);
  });

  it("cambia aria-label al completar la tarea", () => {
    const onToggleCompleted = vi.fn();
    render(
      <TaskCard
        task={{ ...baseTask, completed: true }}
        onToggleCompleted={onToggleCompleted}
      />
    );
    const btn = screen.getByRole("button", {
      name: /Marcar tarea como pendiente/,
    });
    expect(btn).toBeInTheDocument();
  });

  it("llama onDelete al hacer clic en el botón de eliminar", () => {
    const onDelete = vi.fn();
    render(<TaskCard task={baseTask} onDelete={onDelete} />);
    const btn = screen.getByRole("button", { name: /Eliminar tarea/ });
    fireEvent.click(btn);
    expect(onDelete).toHaveBeenCalledWith("task_1");
  });

  it("aplica estilo de estado vencido cuando la tarea no está completada y la fecha pasó", () => {
    const overdueTask: Task = {
      ...baseTask,
      dueDate: new Date(Date.now() - 86400000),
      completed: false,
    };
    render(<TaskCard task={overdueTask} />);
    expect(screen.getByText(/Vencido/)).toBeInTheDocument();
  });

  it("aplica estilo de estado completado (emerald) cuando la tarea está completada", () => {
    render(<TaskCard task={{ ...baseTask, completed: true }} />);
    const title = screen.getByText("Revisar contrato");
    expect(title).toHaveClass("line-through");
  });
});
