"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/shared/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";

type DashboardMetrics = {
  totalActive: number;
  totalPipelineValue: number;
  conversionRate: number;
  avgDaysPerStage: Record<string, number>;
  staleCount: number;
};

const STAGE_LABELS: Record<string, string> = {
  Lead: "Lead",
  Contacted: "Contactado",
  InDiscussion: "En conversación",
  ProposalSent: "Propuesta enviada",
  Negotiation: "Negociación",
  Accepted: "Aceptado",
  OnHold: "En espera",
  InDevelopment: "En desarrollo",
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) setMetrics(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState onRetry={fetchMetrics} />;
  if (!metrics || metrics.totalActive === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="Tu dashboard estará aquí"
          description="Agrega oportunidades en el Pipeline para ver tus métricas."
          action={
            <a
              href="/kanban"
              className="text-sm text-accent underline underline-offset-4 hover:text-accent-hover"
            >
              Ir al Pipeline
            </a>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold text-ink">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-ink-secondary">
              Oportunidades activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-ink">{metrics.totalActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-ink-secondary">
              Valor del pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-ink">
              ${metrics.totalPipelineValue.toLocaleString("es")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-ink-secondary">
              Tasa de conversión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-ink">
              {metrics.conversionRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-ink-secondary">
              Oportunidades estancadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">
              {metrics.staleCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(metrics.avgDaysPerStage).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Días promedio por etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(metrics.avgDaysPerStage).map(([stage, days]) => (
                <div
                  key={stage}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-subtle px-3 py-2"
                >
                  <span className="text-sm text-ink-secondary">
                    {STAGE_LABELS[stage] || stage}
                  </span>
                  <span className="text-sm font-medium text-ink">
                    {Math.round(days * 10) / 10}d
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
