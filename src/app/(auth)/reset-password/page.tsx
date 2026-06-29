"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Revisa tu email</CardTitle>
            <CardDescription>
              Si existe una cuenta con ese email, te hemos enviado un enlace de recuperación.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-ink-secondary">
              ¿No lo recibiste?{" "}
              <button
                type="button"
                className="text-accent underline underline-offset-4 hover:text-accent-hover"
                onClick={() => setSent(false)}
              >
                Intentar de nuevo
              </button>
            </p>
            <p className="mt-4">
              <a
                href="/login"
                className="text-sm text-ink-secondary underline underline-offset-4 hover:text-ink"
              >
                Volver a iniciar sesión
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Restablecer contraseña</CardTitle>
          <CardDescription>
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full">
              Enviar enlace
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-ink-secondary">
            <a
              href="/login"
              className="underline underline-offset-4 hover:text-ink"
            >
              Volver a iniciar sesión
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
