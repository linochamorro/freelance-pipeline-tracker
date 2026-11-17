// src/app/(auth)/register/page.tsx
// Vista de registro accesible (F04-T03 + wiring real F05-T01).
// Conserva las props opcionales onRegister/loading/error (usadas por pruebas
// y posibles hosts). Cuando NO se pasa onRegister, el submit por defecto
// llama a POST /api/auth/register: 201 crea la cuenta con sesión
// auto-iniciada por cookie httpOnly y redirige a "/"; 409 muestra
// "Ese correo ya está registrado". El cliente nunca envía identidad
// (sin x-user-id) ni secretos.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";

export interface RegisterPageProps {
  onRegister?: (data: {
    name: string;
    email: string;
    password: string;
  }) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
}

interface RegisterApiResponse {
  success: boolean;
  data?: { id: string; name: string; email: string };
  error?: { code?: string; message?: string };
}

export default function RegisterPage({
  onRegister,
  loading = false,
  error = null,
}: RegisterPageProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [wiredError, setWiredError] = useState<string | null>(null);

  const handleSubmit = async (data: {
    name: string;
    email: string;
    password: string;
  }) => {
    // Contrato con host externo: las props mandan y no se toca el wiring.
    if (onRegister) {
      await onRegister(data);
      return;
    }

    // Wiring real (F05-T01): POST /api/auth/register con ApiResponse<T>.
    setWiredError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 409) {
        setWiredError("Ese correo ya está registrado");
        return;
      }

      const json = (await res.json().catch(() => null)) as RegisterApiResponse | null;
      if (!res.ok || !json?.success) {
        setWiredError(
          json?.error?.message ||
            "No se pudo crear la cuenta. Inténtalo de nuevo.",
        );
        return;
      }

      // Sesión auto-iniciada por la cookie httpOnly del servidor.
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
            Crear cuenta
          </h1>
          <p className="text-sm text-slate-600  mb-6">
            Regístrate para empezar a gestionar tu pipeline comercial.
          </p>
          <RegisterForm
            onSubmit={handleSubmit}
            loading={loading || submitting}
            error={error ?? wiredError}
          />
        </div>
        <p className="mt-6 text-sm text-slate-500  text-center">
          Ya tienes una cuenta?{" "}
          <a
            href="/login"
            className="text-indigo-600  hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 rounded"
          >
            Iniciar sesión
          </a>
        </p>
      </div>
    </main>
  );
}
