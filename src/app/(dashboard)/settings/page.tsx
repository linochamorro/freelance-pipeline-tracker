// src/app/(dashboard)/settings/page.tsx
// Página de configuración (/settings). Consume GET/PUT /api/settings para
// leer y actualizar los umbrales de inactividad por etapa y las notificaciones.
//
// M-3 (F05-T01 loop 2/3, decisión de Lino 2026-11-14): la moneda es PEN fija
// con el símbolo literal "S/."; no hay preferencia de moneda, por lo que el
// cuerpo del PUT no incluye ningún campo `currency`.

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { SettingsForm } from "@/components/dashboard/settings-form";
import type { UserSettings } from "@/types";

interface SettingsApiResponse {
  success: boolean;
  data?: UserSettings;
  error?: { code?: string; message?: string; details?: unknown };
}

export interface SettingsPageProps {
  initialSettings?: UserSettings;
  initialLoading?: boolean;
  initialError?: string | null;
  onSave?: (data: unknown) => void | Promise<void>;
}

// Datos que el formulario de preferencias envía (M-3: sin `currency`).
interface SettingsFormPayload {
  prospectionStalenessDays?: number;
  proposalStalenessDays?: number;
  executionStalenessDays?: number;
  billingStalenessDays?: number;
  closedStalenessDays?: number;
  notificationEnabled?: boolean;
}

export default function SettingsPage({
  initialSettings,
  initialLoading,
  initialError = null,
  onSave,
}: SettingsPageProps) {
  const [settings, setSettings] = useState<UserSettings | null>(
    initialSettings || null,
  );
  const [loading, setLoading] = useState<boolean>(
    initialLoading === undefined ? initialSettings === undefined : initialLoading,
  );
  const [error, setError] = useState<string | null>(initialError);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      const json = (await res.json().catch(() => ({}))) as SettingsApiResponse;
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ||
            `Error ${res.status}: No se pudo cargar la configuración`,
        );
      }
      setSettings(json.data ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar la configuración",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialSettings !== undefined) {
      setSettings(initialSettings);
      setLoading(false);
    } else if (!initialLoading && !initialError) {
      fetchSettings();
    }
  }, [initialSettings, initialLoading, initialError, fetchSettings]);

  const handleSave = async (data: unknown) => {
    setError(null);
    setSaved(false);
    try {
      if (onSave) {
        await onSave(data);
      } else {
        // El contrato SettingsUpdateSchema (congelado en F01-T03) exige el id
        // de UserSettings en el cuerpo del PUT; sin él la API responde 400
        // VALIDATION_ERROR y el usuario nunca podría guardar. Fix F05-T02:
        // se añade el id de la configuración cargada por GET.
        // M-3: el cuerpo se construye de forma explícita con los campos
        // aceptados por el contrato; no viaja ninguna preferencia de moneda.
        const form = (data ?? {}) as SettingsFormPayload;
        const payload = {
          id: settings?.id,
          prospectionStalenessDays: form.prospectionStalenessDays,
          proposalStalenessDays: form.proposalStalenessDays,
          executionStalenessDays: form.executionStalenessDays,
          billingStalenessDays: form.billingStalenessDays,
          closedStalenessDays: form.closedStalenessDays,
          notificationEnabled: form.notificationEnabled,
        };
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as SettingsApiResponse;
        if (!res.ok || !json.success) {
          throw new Error(
            json.error?.message ||
              `Error ${res.status}: No se pudo guardar la configuración`,
          );
        }
        setSettings(json.data as UserSettings);
      }
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar la configuración",
      );
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50  p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 ">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-200  text-slate-700 ">
            <Save className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900  tracking-tight">
              Configuración
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 ">
              Ajusta los umbrales de inactividad por etapa y las notificaciones.
            </p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
        ) : null}
      </header>

      {/* CARGA */}
      {loading && (
        <div
          className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-200  bg-white  space-y-3"
        >
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-700 ">
            Cargando configuración...
          </p>
        </div>
      )}

      {/* ERROR LECTURA */}
      {!loading && error && settings === null && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl border border-rose-200  bg-rose-50/70  gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-rose-900 ">
                No se pudo cargar la configuración
              </h3>
              <p className="text-xs text-rose-700 ">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
          >
            <Loader2 className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* FORMULARIO */}
      {!loading && settings && (
        <div className="max-w-2xl">
          <SettingsForm
            settings={settings}
            onSubmit={handleSave}
            loading={loading}
            error={error}
          />
          {saved && (
            <div
              role="status"
              className="mt-4 rounded-md border border-emerald-200  bg-emerald-50/80  px-3 py-2 text-sm text-emerald-700 "
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2" />
              Configuración guardada correctamente.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
