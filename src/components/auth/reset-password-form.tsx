// src/components/auth/reset-password-form.tsx
// Formulario de restablecimiento de contraseña accesible (token + nueva contraseña ≥ 8).
// El token puede venir precargado desde el parámetro de URL ?token=.
// Validación visual: token obligatorio, contraseña ≥ 8 caracteres,
// mensajes de error con aria-describedby.

"use client";

import { useState, useCallback, useEffect } from "react";

interface ResetPasswordFormProps {
  onSubmit: (data: { token: string; password: string }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  /** Token inicial opcional (útil en pruebas y cuando la página lo pasa por props). */
  initialToken?: string;
}

export function ResetPasswordForm({
  onSubmit,
  loading = false,
  error = null,
  initialToken,
}: ResetPasswordFormProps) {
  const tokenFromUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") || ""
      : "";
  const initialTokenValue = initialToken ?? tokenFromUrl;

  const [formData, setFormData] = useState({
    token: initialTokenValue,
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Sincroniza el token de la URL si llega tras el primer render y no hay initialToken.
  useEffect(() => {
    if (!initialToken && tokenFromUrl && !formData.token) {
      setFormData((prev) => ({ ...prev, token: tokenFromUrl }));
    }
  }, [initialToken, tokenFromUrl, formData.token]);

  const handleChange = useCallback(
    (key: string, value: string) => {
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
    if (!formData.token) {
      next.token = "El token de restablecimiento es obligatorio";
    }
    if (!formData.password) {
      next.password = "La nueva contraseña es obligatoria";
    } else if (formData.password.length < 8) {
      next.password = "La contraseña debe tener al menos 8 caracteres";
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
        token: formData.token,
        password: formData.password,
      });
    },
    [formData, validate, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="reset-token"
          className="block text-sm font-medium text-slate-700"
        >
          Token de restablecimiento
        </label>
        <input
          id="reset-token"
          name="token"
          type="text"
          autoFocus
          required
          aria-required="true"
          aria-describedby={fieldErrors.token ? "reset-token-error" : undefined}
          value={formData.token}
          onChange={(e) => handleChange("token", e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${
            fieldErrors.token
              ? "border-rose-600 focus:ring-2 focus:ring-rose-500"
              : "border-slate-300 focus:ring-2 focus:ring-indigo-500"
          }`}
        />
        {fieldErrors.token && (
          <p id="reset-token-error" className="mt-1 text-xs text-rose-600" role="alert">
            {fieldErrors.token}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="reset-password"
          className="block text-sm font-medium text-slate-700"
        >
          Nueva contraseña
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          required
          aria-required="true"
          aria-describedby={fieldErrors.password ? "reset-password-error" : undefined}
          minLength={8}
          value={formData.password}
          onChange={(e) => handleChange("password", e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${
            fieldErrors.password
              ? "border-rose-600 focus:ring-2 focus:ring-rose-500"
              : "border-slate-300 focus:ring-2 focus:ring-indigo-500"
          }`}
        />
        {fieldErrors.password && (
          <p
            id="reset-password-error"
            className="mt-1 text-xs text-rose-600"
            role="alert"
          >
            {fieldErrors.password}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Mínimo 8 caracteres.
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
        className="inline-flex items-center justify-center w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Restablecer contraseña…" : "Restablecer contraseña"}
      </button>
    </form>
  );
}
