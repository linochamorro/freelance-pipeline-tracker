"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/shared/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Check } from "lucide-react";

type UserSettings = {
  leadStalenessDays: number;
  contactedStalenessDays: number;
  discussionStalenessDays: number;
  proposalStalenessDays: number;
  negotiationStalenessDays: number;
  acceptedStalenessDays: number;
  onHoldStalenessDays: number;
  developmentStalenessDays: number;
  notificationEnabled: boolean;
};

const STAGE_FIELDS: { key: keyof UserSettings; label: string }[] = [
  { key: "leadStalenessDays", label: "Lead" },
  { key: "contactedStalenessDays", label: "Contactado" },
  { key: "discussionStalenessDays", label: "En conversación" },
  { key: "proposalStalenessDays", label: "Propuesta enviada" },
  { key: "negotiationStalenessDays", label: "Negociación" },
  { key: "acceptedStalenessDays", label: "Aceptado" },
  { key: "onHoldStalenessDays", label: "En espera" },
  { key: "developmentStalenessDays", label: "En desarrollo" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) setSettings(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState onRetry={fetchSettings} />;
  if (!settings) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4">
      <h1 className="text-xl font-semibold text-ink">Ajustes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Límites de inactividad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Las tarjetas que no se actualicen en más de esta cantidad de días
            mostrarán un indicador de inactividad.
          </p>
          {STAGE_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                min={1}
                max={365}
                className="w-20"
                value={settings[key] as number}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    [key]: parseInt(e.target.value) || 7,
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notificationEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notificationEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-border text-accent focus:ring-focus-ring"
            />
            <span className="text-sm text-ink">
              Activar recordatorios de seguimiento para oportunidades inactivas
            </span>
          </label>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saved ? (
          <>
            <Check className="h-4 w-4" />
            Guardado
          </>
        ) : saving ? (
          "Guardando..."
        ) : (
          "Guardar ajustes"
        )}
      </Button>
    </div>
  );
}
