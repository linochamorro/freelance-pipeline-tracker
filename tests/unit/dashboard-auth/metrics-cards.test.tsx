// tests/unit/dashboard-auth/metrics-cards.test.tsx
// Pruebas de UI para MetricsCards (F04-T03, ciclo RED → GREEN → REFACTOR).
// Métricas: valor del pipeline, tasa de conversión, deals activos, deals inactivos.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricsCards } from "@/components/dashboard/metrics-cards";

describe("MetricsCards", () => {
  const metrics = {
    pipelineValue: 28500,
    conversionRate: 50,
    activeDeals: 4,
    staleDeals: [
      {
        id: "d1",
        clientName: "Globex",
        pipelineStage: "ProposalSent" as const,
        updatedAt: new Date("2026-11-05T10:00:00Z"),
        daysOverdue: 2,
      },
    ],
  };

  it("renderiza las cuatro tarjetas de métrica con sus títulos y valores", () => {
    render(<MetricsCards metrics={metrics} />);

    expect(screen.getByText(/valor del pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/tasa de conversi[oó]n/i)).toBeInTheDocument();
    expect(screen.getByText(/deals activos/i)).toBeInTheDocument();
    expect(screen.getByText(/deals inactivos/i)).toBeInTheDocument();

    // M-2 (F05-T01 loop 2/3): PEN fijo con símbolo literal "S/." (es-PE).
    expect(screen.getByText("S/. 28,500.00")).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });

  it("muestra el valor del pipeline en soles peruanos sin etiqueta de moneda", () => {
    render(<MetricsCards metrics={metrics} />);

    expect(screen.getByText("S/. 28,500.00")).toBeInTheDocument();
    // M-3: sin etiqueta residual "(USD)"/"(EUR)"/"(PEN)" ni símbolo "$".
    expect(screen.queryByText(/\((USD|EUR|PEN)\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("tiene roles de región y etiquetas accesibles para cada métrica", () => {
    render(<MetricsCards metrics={metrics} />);

    const cards = screen.getAllByRole("region");
    expect(cards.length).toBe(4);
    cards.forEach((card) => {
      expect(card).toHaveAttribute("aria-label");
    });
  });

  it("muestra estado vacío cuando no hay métricas", () => {
    render(<MetricsCards metrics={{ pipelineValue: 0, conversionRate: 0, activeDeals: 0, staleDeals: [] }} />);

    expect(screen.getByText("S/. 0.00")).toBeInTheDocument();
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });
});
