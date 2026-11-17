// tests/components/tasks/task-list.test.ts
// Pruebas de componente para TaskList con estados empty, loading, error, success.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskList } from "@/components/tasks/task-list";
import type { Task } from "@/types";

const baseTask = {
  id: "task_1",
  userId: "user_1",
  opportunityId: null,
  title: "Revisar contrato",
  description: "Leer cláusulas",
  dueDate: new Date(),
  completed: false,
  leadMinutes: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
  notifications: [],
} as Task;

describe("TaskList", () => {
  const onToggleCompleted = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    onToggleCompleted.mockReset();
    onDelete.mockReset();
  });

  it("muestra estado loading con rol status", () => {
    render(
      <TaskList
        tasks={[]}
        status="loading"
        error={null}
        onToggleCompleted={onToggleCompleted}
        onDelete={onDelete}
      />
    );
    expect(screen.getByRole("status", { name: /Cargando tareas/ })).toBeInTheDocument();
  });

  it("muestra estado error con rol alert", () => {
    render(
      <TaskList
        tasks={[]}
        status="error"
        error="No se pudieron cargar"
        onToggleCompleted={onToggleCompleted}
        onDelete={onDelete}
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("No se pudieron cargar")).toBeInTheDocument();
  });

  it("muestra estado empty cuando no hay tareas", () => {
    render(
      <TaskList
        tasks={[]}
        status="success"
        error={null}
        onToggleCompleted={onToggleCompleted}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText(/No hay tareas/)).toBeInTheDocument();
  });

  it("renderiza lista de tareas con rol list y listitems", () => {
    render(
      <TaskList
        tasks={[baseTask, { ...baseTask, id: "task_2", title: "Otra tarea" }]}
        status="success"
        error={null}
        onToggleCompleted={onToggleCompleted}
        onDelete={onDelete}
      />
    );
    const list = screen.getByRole("list", { name: /Lista de tareas/ });
    expect(list).toBeInTheDocument();
    expect(screen.getByText("Revisar contrato")).toBeInTheDocument();
    expect(screen.getByText("Otra tarea")).toBeInTheDocument();
  });

  it("llama onToggleCompleted al hacer clic en botón de completar", () => {
    render(
      <TaskList
        tasks={[baseTask]}
        status="success"
        error={null}
        onToggleCompleted={onToggleCompleted}
        onDelete={onDelete}
      />
    );
    const btn = screen.getByRole("button", {
      name: /Marcar tarea como completada/,
    });
    fireEvent.click(btn);
    expect(onToggleCompleted).toHaveBeenCalledWith("task_1", true);
  });

  it("llama onDelete al hacer clic en botón de eliminar", () => {
    render(
      <TaskList
        tasks={[baseTask]}
        status="success"
        error={null}
        onToggleCompleted={onToggleCompleted}
        onDelete={onDelete}
      />
    );
    const btn = screen.getByRole("button", { name: /Eliminar tarea/ });
    fireEvent.click(btn);
    expect(onDelete).toHaveBeenCalledWith("task_1");
  });
});
