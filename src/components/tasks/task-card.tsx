// src/components/tasks/task-card.tsx
// Tarjeta individual de tarea con estados semánticos y accesibilidad WCAG 2.2 AA.

"use client";

import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onToggleCompleted?: (id: string, completed: boolean) => void;
  onDelete?: (id: string) => void;
}

export function TaskCard({
  task,
  onToggleCompleted,
  onDelete,
}: TaskCardProps) {
  const isOverdue =
    !task.completed && new Date(task.dueDate) < new Date();
  const isCompleted = task.completed;

  // Estado semántico: completado (emerald), vencido (rose), alerta/inactivo (amber), default (slate)
  let stateColor = "slate";
  let stateBg = "slate-50";
  let stateText = "slate-700";
  let borderColor = "slate-200";
  if (isCompleted) {
    stateColor = "emerald";
    stateBg = "emerald-50";
    stateText = "emerald-700";
    borderColor = "emerald-200";
  } else if (isOverdue) {
    stateColor = "rose";
    stateBg = "rose-50";
    stateText = "rose-700";
    borderColor = "rose-200";
  } else {
    stateColor = "amber";
    stateBg = "amber-50";
    stateText = "amber-700";
    borderColor = "amber-200";
  }

  const dueDate = new Date(task.dueDate).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article
      role="listitem"
      className={`group relative rounded-xl border border-${borderColor} bg-white p-4 shadow-sm transition-all duration-200 ${isCompleted ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={isCompleted}
          aria-label={
            isCompleted
              ? "Marcar tarea como pendiente"
              : "Marcar tarea como completada"
          }
          data-task-id={task.id}
          data-action="toggle-completed"
          className={`w-6 h-6 rounded-full border-2 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
            isCompleted
              ? "bg-emerald-600 border-emerald-600"
              : "border-slate-300 bg-white hover:border-indigo-500"
          }`}
          onClick={() => {
            if (onToggleCompleted) {
              onToggleCompleted(task.id, !isCompleted);
            }
          }}
        >
          {isCompleted && (
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3
            data-task-id={task.id}
            data-action="task-title"
            className={`text-sm font-semibold leading-tight ${stateText} ${
              isCompleted ? "line-through" : ""
            }`}
          >
            {task.title}
          </h3>
          {task.description && (
            <p
              data-task-id={task.id}
              data-action="task-description"
              className={`text-xs text-slate-500 mt-0.5 line-clamp-2 ${isCompleted ? "opacity-80" : ""}`}
            >
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              data-task-id={task.id}
              data-action="task-due-date"
              className={`text-xs font-medium ${stateText}`}
              aria-label={`Fecha límite: ${dueDate}`}
            >
              {isOverdue ? "Vencido" : "Vence"} {dueDate}
            </span>
            <span
              data-task-id={task.id}
              data-action="task-lead"
              className={`text-xs px-1.5 py-0.5 rounded bg-${stateBg}-100 text-${stateText} border border-${borderColor}`}
            >
              {task.leadMinutes} min adelanto
            </span>
          </div>
        </div>

        <div className="ml-2 flex flex-col gap-1">
          <button
            type="button"
            aria-label="Eliminar tarea"
            data-task-id={task.id}
            data-action="delete"
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            onClick={() => {
              if (onDelete) {
                onDelete(task.id);
              }
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

