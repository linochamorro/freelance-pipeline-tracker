// src/app/(auth)/login/page.tsx
// Vista de inicio de sesión accesible (F04-T03 + wiring real F05-T01).
// Conserva las props opcionales onLogin/loading/error (usadas por pruebas y
// posibles hosts). Cuando NO se pasa onLogin, el submit por defecto llama a
// POST /api/auth/login: en éxito redirige a "/" (sesión por cookie httpOnly)
// y en 401 muestra "Credenciales inválidas". El cliente nunca envía identidad
// (sin x-user-id) ni secretos.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export interface LoginPageProps {
  onLogin?: (data: { email: string; password: string }) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
}

interface LoginApiResponse {
  success: boolean;
  data?: { id: string; name: string; email: string };
  error?: { code?: string; message?: string };
}

export default function LoginPage({
  onLogin,
  loading = false,
  error = null,
}: LoginPageProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [wiredError, setWiredError] = useState<string | null>(null);

  const handleSubmit = async (data: { email: string; password: string }) => {
    // Contrato con host externo: las props mandan y no se toca el wiring.
    if (onLogin) {
      await onLogin(data);
      return;
    }

    // Wiring real (F05-T01): POST /api/auth/login con ApiResponse<T>.
    setWiredError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
        setWiredError("Credenciales inválidas");
        return;
      }

      const json = (await res.json().catch(() => null)) as LoginApiResponse | null;
      if (!res.ok || !json?.success) {
        setWiredError(
          json?.error?.message ||
            "No se pudo iniciar la sesión. Inténtalo de nuevo.",
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setWiredError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 ">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-12">
        <div
          className="bg-white  rounded-xl border border-slate-200  p-6 shadow-sm"
        >
          <h1 className="text-xl font-bold text-slate-900  mb-1">
            Iniciar sesión
          </h1>
          <p className="text-sm text-slate-600  mb-6">
            Accede a tu cuenta de Freelance Pipeline Tracker
          </p>
          <LoginForm
            onSubmit={handleSubmit}
            loading={loading || submitting}
            error={error ?? wiredError}
          />
        </div>
        <p className="mt-6 text-sm text-slate-500  text-center">
          ¿Olvidaste tu contraseña?{" "}
          <a
            href="/reset-password"
            className="text-indigo-600  hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 rounded"
          >
            Restablecer contraseña
          </a>
        </p>
      </div>
    </main>
  );
}
