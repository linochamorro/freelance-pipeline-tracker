// src/components/dashboard/settings-form.tsx
// Formulario de preferencias de usuario accesible: umbrales de inactividad
// por etapa (1-365 días) y notificaciones.
// Validación visual con mensajes de error asociados mediante aria-describedby.
//
// M-3 (F05-T01 loop 2/3, decisión de Lino 2026-11-14): la moneda es PEN fija
// con el símbolo literal "S/."; no existe selector ni preferencia de moneda,
// por lo que el formulario no envía ningún campo `currency`.

"use client";

import { useState, useCallback } from "react";
import type { UserSettings } from "@/types";

const STALENESS_FIELDS: Array<{
  key: keyof UserSettings;
  label: string;
  id: string;
  errorId: string;
}> = [
  {
    key: "prospectionStalenessDays",
    label: "Prospectación (días)",
    id: "settings-prospection",
    errorId: "settings-prospection-error",
  },
  {
    key: "proposalStalenessDays",
    label: "Propuesta (días)",
    id: "settings-proposal",
    errorId: "settings-proposal-error",
  },
  {
    key: "executionStalenessDays",
    label: "Ejecución (días)",
    id: "settings-execution",
    errorId: "settings-execution-error",
  },
  {
    key: "billingStalenessDays",
    label: "Facturación (días)",
    id: "settings-billing",
    errorId: "settings-billing-error",
  },
  {
    key: "closedStalenessDays",
    label: "Cerrado (días)",
    id: "settings-closed",
    errorId: "settings-closed-error",
  },
];

interface SettingsFormProps {
  settings: UserSettings;
  onSubmit: (data: {
    prospectionStalenessDays: number;
    proposalStalenessDays: number;
    executionStalenessDays: number;
    billingStalenessDays: number;
    closedStalenessDays: number;
    notificationEnabled: boolean;
  }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function SettingsForm({
  settings,
  onSubmit,
  loading = false,
  error = null,
}: SettingsFormProps) {
  interface SettingsFormData {
    prospectionStalenessDays: string;
    proposalStalenessDays: string;
    executionStalenessDays: string;
    billingStalenessDays: string;
    closedStalenessDays: string;
    notificationEnabled: string | boolean;
  }

  const [formData, setFormData] = useState<SettingsFormData>({
    prospectionStalenessDays: String(
      settings.prospectionStalenessDays ?? 7,
    ),
    proposalStalenessDays: String(settings.proposalStalenessDays ?? 7),
    executionStalenessDays: String(settings.executionStalenessDays ?? 7),
    billingStalenessDays: String(settings.billingStalenessDays ?? 7),
    closedStalenessDays: String(settings.closedStalenessDays ?? 7),
    notificationEnabled: settings.notificationEnabled ?? true,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback(
    (key: string, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      if (fieldErrors[key]) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [fieldErrors],
  );

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    for (const field of STALENESS_FIELDS) {
      const raw = formData[field.key as keyof typeof formData] as string;
      const num = Number(raw);
      if (raw === "" || raw === undefined) {
        next[field.key] = `${field.label} es obligatorio`;
      } else if (!Number.isInteger(num)) {
        next[field.key] = `${field.label} debe ser un número entero`;
      } else if (num > 365) {
        next[field.key] = `Máximo 365 días`;
      } else if (num < 1) {
        next[field.key] = `Mínimo 1 día`;
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);
      if (!validate()) return;
      await onSubmit({
        prospectionStalenessDays: Number(formData.prospectionStalenessDays),
        proposalStalenessDays: Number(formData.proposalStalenessDays),
        executionStalenessDays: Number(formData.executionStalenessDays),
        billingStalenessDays: Number(formData.billingStalenessDays),
        closedStalenessDays: Number(formData.closedStalenessDays),
        notificationEnabled:
          formData.notificationEnabled === true ||
          formData.notificationEnabled === "true",
      });
    },
    [formData, onSubmit, validate],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {STALENESS_FIELDS.map((field) => (
        <div key={field.key}>
          <label
            htmlFor={field.id}
            className="block text-sm font-medium text-slate-700"
          >
            {field.label}
          </label>
          <input
            id={field.id}
            name={field.key}
            type="number"
            min={1}
            max={365}
            required
            aria-required="true"
            aria-describedby={fieldErrors[field.key] ? field.errorId : undefined}
            value={String(formData[field.key as keyof typeof formData])}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${
              fieldErrors[field.key]
                ? "border-rose-600 focus:ring-2 focus:ring-rose-500"
                : "border-slate-300 focus:ring-2 focus:ring-indigo-500"
            }`}
          />
          {fieldErrors[field.key] && (
            <p id={field.errorId} className="mt-1 text-xs text-rose-600" role="alert">
              {fieldErrors[field.key]}
            </p>
          )}
        </div>
      ))}

      <div className="flex items-start gap-3">
        <input
          id="settings-notifications"
          name="notificationEnabled"
          type="checkbox"
          checked={formData.notificationEnabled === true}
          onChange={(e) =>
            handleChange("notificationEnabled", String(e.target.checked))
          }
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label
          htmlFor="settings-notifications"
          className="text-sm text-slate-700 cursor-pointer"
        >
          Activar notificaciones
        </label>
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
        className="inline-flex items-center justify-center w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Guardar configuración…" : "Guardar configuración"}
      </button>
    </form>
  );
}
