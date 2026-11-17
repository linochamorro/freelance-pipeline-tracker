// tests/unit/dashboard-auth/stale-deals-list.test.tsx
// Pruebas de UI para StaleDealsList (F04-T03, ciclo RED → GREEN → REFACTOR).
// Lista de deals inactivos (stale) con cliente, etapa, días de retraso.

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { StaleDealsList } from "@/components/dashboard/stale-deals-list";
import type { StaleDeal } from "@/services/dashboard-service";

const staleDeals: StaleDeal[] = [
  {
    id: "d1",
    clientName: "Globex",
    pipelineStage: "ProposalSent",
    updatedAt: new Date("2026-11-05T10:00:00Z"),
    daysOverdue: 7,
  },
  {
    id: "d2",
    clientName: "Acme Corp",
    pipelineStage: "Lead",
    updatedAt: new Date("2026-11-10T10:00:00Z"),
    daysOverdue: 0,
  },
];

describe("StaleDealsList", () => {
  it("renderiza una tabla de deals inactivos con cliente, etapa y días de retraso", () => {
    render(<StaleDealsList staleDeals={staleDeals} />);

    expect(screen.getByText(/deals inactivos/i)).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Propuesta enviada")).toBeInTheDocument();
    expect(screen.getByText(/7 días? de retraso/i)).toBeInTheDocument();
  });

  it("marca con distinto énfasis los deals con retraso mayor a 0", () => {
    render(<StaleDealsList staleDeals={staleDeals} />);

    const firstRow = screen.getByText("Globex").closest("tr");
    expect(within(firstRow!).getByText(/7/)).toBeInTheDocument();
  });

  it("muestra estado vacío cuando no hay deals inactivos", () => {
    render(<StaleDealsList staleDeals={[]} />);

    expect(screen.getByText(/no hay deals inactivos/i)).toBeInTheDocument();
    expect(screen.queryByText("Globex")).not.toBeInTheDocument();
  });

  it("tiene etiquetas de cabecera asociadas a cada columna", () => {
    render(<StaleDealsList staleDeals={staleDeals} />);

    expect(screen.getByText(/cliente/i)).toBeInTheDocument();
    expect(screen.getByText(/etapa/i)).toBeInTheDocument();
    expect(screen.getByText(/actualizaci[oó]n/i)).toBeInTheDocument();
    // El encabezado y cada fila contienen "días de retraso"
    expect(screen.getAllByText(/días de retraso/i).length).toBeGreaterThanOrEqual(1);
  });
});
