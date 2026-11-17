// src/app/(dashboard)/page.tsx
// Página principal del dashboard (/). Consume GET /api/dashboard y renderiza
// métricas clave (valor del pipeline, conversión, deals activos) más la lista
// de deals inactivos (stale). Accesible: estados de carga, error y vacío.

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { StaleDealsList } from "@/components/dashboard/stale-deals-list";
import type { DashboardMetrics } from "@/services/dashboard-service";

export interface DashboardPageProps {
  initialMetrics?: DashboardMetrics;
  initialLoading?: boolean;
  initialError?: string | null;
  onRetry?: () => void;
}

interface DashboardApiResponse {
  success: boolean;
  data?: DashboardMetrics;
  error?: { code?: string; message?: string };
}

export default function DashboardPage({
  initialMetrics,
  initialLoading,
  initialError = null,
  onRetry,
}: DashboardPageProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(
    initialMetrics || null,
  );
  const [loading, setLoading] = useState<boolean>(
    initialLoading === undefined ? initialMetrics === undefined : initialLoading,
  );
  const [error, setError] = useState<string | null>(initialError);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = (await res.json().catch(() => ({}))) as DashboardApiResponse;
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ||
            `Error ${res.status}: No se pudo cargar el dashboard`,
        );
      }
      setMetrics(json.data || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error desconocido al cargar el dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialMetrics !== undefined) {
      setMetrics(initialMetrics);
      setLoading(false);
    } else if (!initialLoading && !initialError) {
      fetchDashboard();
    }
  }, [initialMetrics, initialLoading, initialError, fetchDashboard]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      fetchDashboard();
    }
  };

  const staleDeals = metrics?.staleDeals || [];

  return (
    <div className="w-full min-h-screen bg-slate-50/50  p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 ">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50  text-indigo-600 ">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900  tracking-tight">
              Dashboard General
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 ">
              Métricas del pipeline y tratos que requieren tu atención.
            </p>
          </div>
        </div>
        {loading ? (
          <button
            type="button"
            disabled
            aria-label="Cargando dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 cursor-not-allowed"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Cargando…
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRetry}
            aria-label="Recargar métricas del dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600  hover:text-indigo-800  cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        )}
      </header>

      {/* CARGA */}
      {loading && (
        <div
          data-testid="dashboard-loading"
          aria-busy="true"
          className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-200  bg-white  space-y-3"
        >
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-700 ">
            Cargando métricas del dashboard...
          </p>
          <p className="text-xs text-slate-500">
            Sincronizando valor del pipeline y tratos inactivos
          </p>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl border border-rose-200  bg-rose-50/70  gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-rose-900 ">
                Error al cargar el dashboard
              </h3>
              <p className="text-xs text-rose-700 ">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* ÉXITO */}
      {!loading && !error && metrics !== null && (
        <div className="space-y-6">
          <MetricsCards metrics={metrics} />

          <section>
            <StaleDealsList staleDeals={staleDeals} />
          </section>
        </div>
      )}
    </div>
  );
}

