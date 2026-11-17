// src/app/(auth)/reset-password/page.tsx
// Vista de restablecimiento de contraseña accesible (token + nueva contraseña).
// Consume POST /api/auth/reset-password. Responde con el mensaje no enumerador
// de la API (ADR-006) sin revelar si el token era válido.

"use client";

import { useState } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export interface ResetPasswordPageProps {
  loading?: boolean;
  error?: string | null;
  /** Token inicial opcional (útil en pruebas y cuando se pasa por props). */
  initialToken?: string;
}

export default function ResetPasswordPage({
  loading = false,
  error = null,
  initialToken,
}: ResetPasswordPageProps) {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const urlToken = initialToken ?? "";

  const handleSubmit = async (data: { token: string; password: string }) => {
    setConfirmation(null);
    setApiError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (json.message) {
        setConfirmation(json.message);
      } else if (!res.ok) {
        setApiError(
          (json.error?.message as string | undefined) ||
            "Error al restablecer la contraseña",
        );
      }
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : "Error al restablecer la contraseña",
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-12">
        <div
          className="bg-white  rounded-xl border border-slate-200  p-6 shadow-sm"
        >
          <h1 className="text-xl font-bold text-slate-900  mb-1">
            Restablecer contraseña
          </h1>
          <p className="text-sm text-slate-600  mb-6">
            Ingresa el token recibido por correo y una nueva contraseña.
          </p>
          <ResetPasswordForm
            onSubmit={handleSubmit}
            loading={loading}
            error={error ?? apiError}
            initialToken={urlToken}
          />
          {confirmation && (
            <div
              role="status"
              className="mt-4 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700"
            >
              {confirmation}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
