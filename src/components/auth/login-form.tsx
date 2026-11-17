// src/components/auth/login-form.tsx
// Formulario de inicio de sesión accesible (email + contraseña).
// Validación visual en cliente: campos obligatorios, formato de email,
// mensajes de error asociados con aria-describedby y estados loading/error.
// Estados: idle, submitting, success, error.

"use client";

import { useState, useCallback } from "react";

interface LoginFormProps {
  onSubmit: (data: { email: string; password: string }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function LoginForm({
  onSubmit,
  loading = false,
  error = null,
}: LoginFormProps) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

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
    if (!formData.email.trim()) {
      next.email = "El correo electrónico es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      next.email = "Correo electrónico inválido";
    }
    if (!formData.password) {
      next.password = "La contraseña es obligatoria";
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
        email: formData.email.trim(),
        password: formData.password,
      });
    },
    [formData, validate, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="login-email"
          className="block text-sm font-medium text-slate-700"
        >
          Correo electrónico
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoFocus
          required
          aria-required="true"
          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${
            fieldErrors.email
              ? "border-rose-600 focus:ring-2 focus:ring-rose-500"
              : "border-slate-300 focus:ring-2 focus:ring-indigo-500"
          }`}
        />
        {fieldErrors.email && (
          <p
            id="login-email-error"
            className="mt-1 text-xs text-rose-600"
            role="alert"
          >
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="block text-sm font-medium text-slate-700"
        >
          Contraseña
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          aria-required="true"
          aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
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
            id="login-password-error"
            className="mt-1 text-xs text-rose-600"
            role="alert"
          >
            {fieldErrors.password}
          </p>
        )}
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
        {loading ? "Iniciar sesión…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
