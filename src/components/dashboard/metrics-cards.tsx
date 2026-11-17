// src/components/dashboard/metrics-cards.tsx
// Tarjetas de métrica del dashboard: valor del pipeline, tasa de conversión,
// deals activos y deals inactivos. Accesible: cada tarjeta es una región con
// aria-label.
//
// M-2/M-3 (F05-T01 loop 2/3, decisión de Lino 2026-11-14): la moneda es PEN
// fija con el símbolo LITERAL "S/." (es-PE). No existe selector ni preferencia
// de moneda, por lo que este componente no recibe ninguna prop `currency` y no
// añade etiquetas residuales del tipo "(USD)" al título de la tarjeta.

"use client";

import { formatPEN } from "@/lib/format-currency";
import type { DashboardMetrics } from "@/services/dashboard-service";

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

const METRICS: Array<{
  key: keyof DashboardMetrics;
  label: string;
  value: (m: DashboardMetrics) => string | number;
  aria: string;
}> = [
  {
    key: "pipelineValue",
    label: "Valor del pipeline",
    value: (m) => formatPEN(m.pipelineValue),
    aria: "tarjeta de métrica valor del pipeline",
  },
  {
    key: "conversionRate",
    label: "Tasa de conversión",
    value: (m) => `${m.conversionRate}%`,
    aria: "tarjeta de métrica tasa de conversión",
  },
  {
    key: "activeDeals",
    label: "Deals activos",
    value: (m) => m.activeDeals,
    aria: "tarjeta de métrica deals activos",
  },
  {
    key: "staleDeals",
    label: "Deals inactivos",
    value: (m) => m.staleDeals.length,
    aria: "tarjeta de métrica deals inactivos",
  },
];

export function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      aria-label="Tarjetas de métrica del dashboard"
    >
      {METRICS.map((metric) => (
        <section
          key={metric.key}
          role="region"
          aria-label={metric.aria}
          className="rounded-xl border border-slate-200  bg-white  p-4 shadow-sm"
        >
          <h3
            className="text-xs font-medium text-slate-500  uppercase tracking-wider"
          >
            {metric.label}
          </h3>
          <p className="mt-1 text-2xl font-bold text-slate-900 ">
            {metric.value(metrics)}
          </p>
        </section>
      ))}
    </div>
  );
}
