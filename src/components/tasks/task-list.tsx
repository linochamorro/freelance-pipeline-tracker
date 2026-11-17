// src/components/tasks/task-list.tsx
// Lista/agenda de tareas con estados empty, loading, error, success.

"use client";

import type { Task } from "@/types";
import { TaskCard } from "./task-card";

export type TaskListStatus = "idle" | "loading" | "success" | "error";

interface TaskListProps {
  tasks: Task[];
  status: TaskListStatus;
  error: string | null;
  onToggleCompleted: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function TaskList({
  tasks,
  status,
  error,
  onToggleCompleted,
  onDelete,
}: TaskListProps) {
  if (status === "loading") {
    return (
      <div
        role="status"
        aria-label="Cargando tareas"
        className="flex flex-col items-center justify-center py-12"
      >
        <svg
          className="animate-spin h-6 w-6 text-indigo-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span className="mt-3 text-sm text-slate-600">Cargando tareas…</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        role="alert"
        aria-label="Error al cargar tareas"
        className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700"
      >
        {error || "Error al cargar las tareas"}
        <button
          type="button"
          className="mt-2 inline text-xs font-medium text-indigo-600 hover:underline"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("refresh-tasks"));
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <section
        aria-label="Sin tareas"
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <svg
          className="h-8 w-8 text-slate-500 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="text-sm font-semibold text-slate-700">No hay tareas</h3>
        <p className="mt-1 text-xs text-slate-500">
          Crea tu primera tarea para comenzar.
        </p>
      </section>
    );
  }

  return (
    <ul
      role="list"
      aria-label="Lista de tareas del usuario"
      className="divide-y divide-slate-200"
    >
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskCard
            task={task}
            onToggleCompleted={onToggleCompleted}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  );
}

