// src/components/tasks/task-form.tsx
// Formulario de nueva tarea con las 5 opciones de adelanto (ADR-005).
// Accesible: labels asociados, campos obligatorios, mensajes de error con aria-describedby.

"use client";

import { useState } from "react";
import type { TaskLeadMinutes } from "@/types";
import { TASK_LEAD_OPTIONS } from "@/types";
import { calculateNotificationTrigger } from "@/lib/rules/task-schedule";

interface TaskFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    dueDate: string;
    leadMinutes: TaskLeadMinutes;
  }) => Promise<boolean>;
  loading?: boolean;
  error?: string | null;
}

export function TaskForm({ onSubmit, loading = false, error = null }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    leadMinutes: TASK_LEAD_OPTIONS[0].value,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Limpiar error del campo al escribir
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleLeadChange = (value: string) => {
    const lead = Number(value) as TaskLeadMinutes;
    setFormData((prev) => ({ ...prev, leadMinutes: lead }));
    if (fieldErrors.leadMinutes) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.leadMinutes;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!formData.title.trim()) nextErrors.title = "El título es obligatorio";
    if (!formData.dueDate) nextErrors.dueDate = "La fecha límite es obligatoria";

    const localDueDate = new Date(formData.dueDate);
    if (!Number.isFinite(localDueDate.getTime())) {
      nextErrors.dueDate = "Fecha límite inválida";
    } else {
      try {
        calculateNotificationTrigger(localDueDate, formData.leadMinutes);
      } catch {
        nextErrors.dueDate =
          nextErrors.dueDate || "Fecha límite inválida para el adelanto seleccionado";
      }
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const created = await onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim(),
      // datetime-local es una hora de pared local sin zona; convertirla a un instante ISO
      // con Z preserva la zona del navegador y cumple el contrato de la API.
      dueDate: localDueDate.toISOString(),
      leadMinutes: formData.leadMinutes,
    });

    if (created) {
      setFormData({
        title: "",
        description: "",
        dueDate: "",
        leadMinutes: TASK_LEAD_OPTIONS[0].value,
      });
      setFieldErrors({});
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      <div>
        <label
          htmlFor="task-title"
          className="block text-sm font-medium text-slate-700"
        >
          Título de la tarea
        </label>
        <input
          id="task-title"
          name="title"
          type="text"
          autoFocus
          minLength={2}
          maxLength={200}
          required
          aria-required="true"
          aria-describedby={fieldErrors.title ? "task-title-error" : undefined}
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${
            fieldErrors.title
              ? "border-rose-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              : "border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          }`}
        />
        {fieldErrors.title && (
          <p id="task-title-error" className="mt-1 text-xs text-rose-600" role="alert">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="task-description"
          className="block text-sm font-medium text-slate-700"
        >
          Descripción
        </label>
        <textarea
          id="task-description"
          name="description"
          rows={3}
          maxLength={2000}
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        />
      </div>

      <div>
        <label
          htmlFor="task-due-date"
          className="block text-sm font-medium text-slate-700"
        >
          Fecha límite
        </label>
        <input
          id="task-due-date"
          name="dueDate"
          type="datetime-local"
          required
          aria-required="true"
          aria-describedby={fieldErrors.dueDate ? "task-due-date-error" : undefined}
          value={formData.dueDate}
          onChange={(e) => handleChange("dueDate", e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${
            fieldErrors.dueDate
              ? "border-rose-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              : "border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          }`}
        />
        {fieldErrors.dueDate && (
          <p id="task-due-date-error" className="mt-1 text-xs text-rose-600" role="alert">
            {fieldErrors.dueDate}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="task-lead-minutes"
          className="block text-sm font-medium text-slate-700"
        >
          Adelanto de notificación
        </label>
        <select
          id="task-lead-minutes"
          name="leadMinutes"
          value={String(formData.leadMinutes)}
          required
          aria-required="true"
          aria-describedby={fieldErrors.leadMinutes ? "task-lead-error" : undefined}
          onChange={(e) => handleLeadChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {TASK_LEAD_OPTIONS.map((opt) => (
            <option key={opt.value} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
        {fieldErrors.leadMinutes && (
          <p id="task-lead-error" className="mt-1 text-xs text-rose-600" role="alert">
            {fieldErrors.leadMinutes}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Se calculará automáticamente el momento de disparo del recordatorio.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creando…" : "Crear tarea"}
      </button>
    </form>
  );
}
