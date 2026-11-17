// src/app/(dashboard)/tasks/page.tsx
// Vista de agenda de tareas (/tasks) con lista, formulario y campana de avisos.
// Consume GET/POST /api/tasks y GET /api/notifications con sesión por cookie
// (same-origin; el navegador envía la cookie automáticamente). Accesible y responsive.

"use client";

import { useState, useCallback, useEffect } from "react";
import type { Task } from "@/types";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskList, type TaskListStatus } from "@/components/tasks/task-list";
import { NotificationBell } from "@/components/tasks/notification-bell";

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`/api/tasks`);
  if (!res.ok) throw new Error("Error al cargar tareas");
  const json = (await res.json()) as {
    success: boolean;
    data?: Task[];
    error?: { message?: string };
  };
  if (!json.success) throw new Error(json.error?.message || "Error al cargar tareas");
  return json.data || [];
}

async function createTaskApi(payload: {
  title: string;
  description: string;
  dueDate: string;
  leadMinutes: number;
}): Promise<Task> {
  const res = await fetch(`/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  type TaskApiResponse = {
    success?: boolean;
    data?: Task;
    error?: { message?: string };
  };
  let json: TaskApiResponse | null = null;
  try {
    json = (await res.json()) as TaskApiResponse;  } catch {
    // Respuestas no-JSON usan el mensaje de fallback seguro.
  }

  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message || "Error al crear tarea");
  }
  return json.data!;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<TaskListStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadTasks = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchTasks();
      setTasks(data);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Reescuchar evento de actualización global (ej. tras marcar notificación)
  useEffect(() => {
    const handler = () => loadTasks();
    window.addEventListener("refresh-tasks", handler);
    return () => window.removeEventListener("refresh-tasks", handler);
  }, [loadTasks]);

  const handleCreate = async (payload: {
    title: string;
    description: string;
    dueDate: string;
    leadMinutes: number;
  }): Promise<boolean> => {
    setCreating(true);
    setError(null);
    try {
      const newTask = await createTaskApi(payload);
      setTasks((prev) => [newTask, ...prev]);
      setStatus("success");
      window.dispatchEvent(new CustomEvent("refresh-notifications"));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear tarea");
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleToggleCompleted = async (id: string, completed: boolean) => {
    // Delegado al servicio; aquí se actualiza optimistamente si se desea.
    // Se expone para futura integración con PATCH /api/tasks/[id].
  };

  const handleDelete = async (id: string) => {
    // Delegado al servicio; se expone para futura integración con DELETE /api/tasks/[id].
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda de tareas</h1>
            <p className="mt-1 text-sm text-slate-600">
              Gestiona tus tareas pendientes y recibe recordatorios.
            </p>
          </div>
          <NotificationBell />
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TaskForm
              onSubmit={handleCreate}
              loading={creating}
              error={error}
            />
          </div>
          <div className="lg:col-span-1">
            <aside className="sticky top-6">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Resumen
              </p>
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">
                  {tasks.length} tarea{tasks.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {tasks.filter((t) => !t.completed).length} pendiente{tasks.filter((t) => !t.completed).length !== 1 ? "s" : ""}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-6">
          <TaskList
            tasks={tasks}
            status={status}
            error={error}
            onToggleCompleted={handleToggleCompleted}
            onDelete={handleDelete}
          />
        </section>
      </div>
    </main>
  );
}
