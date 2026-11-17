// tests/unit/pipeline/archive-view.test.tsx
// Pruebas unitarias completas de la Vista de Oportunidades Archivadas
// Cumple con CA-04 (F02-T04): listado de archivadas, preservación de etapa original,
// restitución/desarchivo vía POST /api/opportunities/[id]/archive, filtros por búsqueda,
// canal (ADR-004) y etapa, y los 4 estados canónicos (loading, error, empty, success).

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ArchivePage from "@/app/(dashboard)/archive/page";
import type { Opportunity } from "@/types";

const mockArchivedOpportunities: Opportunity[] = [
  {
    id: "opp-arch-1",
    userId: "user-1",
    clientName: "Alpha Logistics",
    description: "Sistema de ruteo y seguimiento de flotas",
    estimatedBudget: 7500,
    contactPersonName: "Carlos Vega",
    contactChannel: "LinkedIn",
    pipelineStage: "Negotiation",
    paymentStatus: null,
    developmentStatus: null,
    isArchived: true,
    createdAt: new Date("2026-10-10T10:00:00Z"),
    updatedAt: new Date("2026-10-25T15:00:00Z"),
  },
  {
    id: "opp-arch-2",
    userId: "user-1",
    clientName: "Beta Health",
    description: "Portal médico para citas telepresenciales",
    estimatedBudget: 12000,
    contactPersonName: "Dra. Sofía Morales",
    contactChannel: "Email",
    pipelineStage: "ProposalSent",
    paymentStatus: "Pending",
    developmentStatus: null,
    isArchived: true,
    createdAt: new Date("2026-09-15T08:30:00Z"),
    updatedAt: new Date("2026-10-01T12:00:00Z"),
  },
  {
    id: "opp-arch-3",
    userId: "user-1",
    clientName: "Gamma Retail",
    description: "Integración de pasarela de pagos stripe",
    estimatedBudget: 4200,
    contactPersonName: "Marcos Ruiz",
    contactChannel: "Referral",
    pipelineStage: "Lead",
    paymentStatus: null,
    developmentStatus: null,
    isArchived: true,
    createdAt: new Date("2026-10-05T14:00:00Z"),
    updatedAt: new Date("2026-10-18T18:00:00Z"),
  },
  {
    id: "opp-arch-4",
    userId: "user-1",
    clientName: "Delta Logistics Corp",
    description: "App móvil para conductores",
    estimatedBudget: 9000,
    contactPersonName: "Andrés Silva",
    contactChannel: "WhatsApp",
    pipelineStage: "Accepted",
    paymentStatus: null,
    developmentStatus: "InProgress",
    isArchived: true,
    createdAt: new Date("2026-09-20T11:00:00Z"),
    updatedAt: new Date("2026-10-12T09:00:00Z"),
  },
];

describe("Vista de Oportunidades Archivadas (/archive)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Los 4 Estados Canónicos", () => {
    it("muestra el estado de CARGA (loading) con spinner accesible y aria-busy", () => {
      render(<ArchivePage initialLoading={true} />);

      const loadingEl = screen.getByTestId("archive-loading");
      expect(loadingEl).toBeInTheDocument();
      expect(loadingEl).toHaveAttribute("aria-busy", "true");
      expect(screen.getByText(/Cargando oportunidades archivadas/i)).toBeInTheDocument();
    });

    it("muestra el estado de ERROR con mensaje descriptivo y botón de reintento funcional", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();

      render(
        <ArchivePage
          initialError="Error 500: Fallo al obtener archivo"
          onRetry={onRetry}
        />,
      );

      const errorEl = screen.getByTestId("archive-error");
      expect(errorEl).toBeInTheDocument();
      expect(errorEl).toHaveAttribute("role", "alert");
      expect(screen.getByText(/Error 500: Fallo al obtener archivo/i)).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();
      await user.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("muestra el estado VACÍO (empty) con el mensaje empático canónico", () => {
      render(<ArchivePage initialOpportunities={[]} />);

      const emptyEl = screen.getByTestId("archive-empty");
      expect(emptyEl).toBeInTheDocument();
      expect(
        screen.getByText(/No hay oportunidades archivadas/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Los tratos archivados conservan su etapa original y pueden reactivarse en cualquier momento/i),
      ).toBeInTheDocument();
    });

    it("muestra el estado de ÉXITO (success) listando las oportunidades archivadas", () => {
      render(<ArchivePage initialOpportunities={mockArchivedOpportunities} />);

      expect(screen.getByTestId("archive-content")).toBeInTheDocument();
      expect(screen.getByText("Alpha Logistics")).toBeInTheDocument();
      expect(screen.getByText("Beta Health")).toBeInTheDocument();
      expect(screen.getByText("Gamma Retail")).toBeInTheDocument();
      expect(screen.getByText("Delta Logistics Corp")).toBeInTheDocument();
    });
  });

  describe("2. Renderizado de Datos y Preservación de Etapa Original", () => {
    it("exhibe cliente, descripción, presupuesto formateado en PEN, canal y etapa original", () => {
      render(<ArchivePage initialOpportunities={mockArchivedOpportunities} />);

      // Elemento Alpha Logistics
      const itemAlpha = screen.getByTestId("archived-deal-opp-arch-1");
      expect(itemAlpha).toBeInTheDocument();

      // Cliente y descripción
      expect(within(itemAlpha).getByText("Alpha Logistics")).toBeInTheDocument();
      expect(
        within(itemAlpha).getByText("Sistema de ruteo y seguimiento de flotas"),
      ).toBeInTheDocument();

      // Presupuesto formateado en PEN (símbolo literal "S/.")
      expect(within(itemAlpha).getByText("S/. 7,500.00")).toBeInTheDocument();

      // Canal de contacto
      expect(within(itemAlpha).getByText(/LinkedIn/i)).toBeInTheDocument();

      // Etapa original preservada: Negotiation
      expect(within(itemAlpha).getByText(/Negociación|Negotiation/i)).toBeInTheDocument();
      expect(within(itemAlpha).getByTestId("original-stage-badge")).toHaveTextContent(
        /Negociación|Negotiation/i,
      );
    });

    it("muestra la persona de contacto si está disponible", () => {
      render(<ArchivePage initialOpportunities={mockArchivedOpportunities} />);
      const itemBeta = screen.getByTestId("archived-deal-opp-arch-2");
      expect(within(itemBeta).getByText("Dra. Sofía Morales")).toBeInTheDocument();
    });
  });

  describe("3. Filtros y Búsqueda", () => {
    it("filtra por búsqueda textual en cliente o descripción", async () => {
      const user = userEvent.setup();
      render(<ArchivePage initialOpportunities={mockArchivedOpportunities} />);

      const searchInput = screen.getByPlaceholderText(/Buscar por cliente o descripción/i);
      await user.type(searchInput, "médico");

      expect(screen.getByText("Beta Health")).toBeInTheDocument();
      expect(screen.queryByText("Alpha Logistics")).not.toBeInTheDocument();
      expect(screen.queryByText("Gamma Retail")).not.toBeInTheDocument();
    });

    it("filtra por los 7 canales canónicos de ADR-004 más la opción 'Todos'", async () => {
      const user = userEvent.setup();
      render(<ArchivePage initialOpportunities={mockArchivedOpportunities} />);

      const channelSelect = screen.getByLabelText(/Filtrar por canal/i);
      expect(channelSelect).toBeInTheDocument();

      // Verificar que los 7 canales están presentes en el select
      const canonicalChannels = [
        "LinkedIn",
        "Email",
        "Referral",
        "ColdOutreach",
        "WhatsApp",
        "Phone",
        "Other",
      ];
      canonicalChannels.forEach((channel) => {
        expect(
          within(channelSelect).getByRole("option", { name: new RegExp(channel, "i") }),
        ).toBeInTheDocument();
      });

      // Seleccionar canal "WhatsApp"
      fireEvent.change(channelSelect, { target: { value: "WhatsApp" } });

      expect(screen.getByText("Delta Logistics Corp")).toBeInTheDocument();
      expect(screen.queryByText("Alpha Logistics")).not.toBeInTheDocument();
      expect(screen.queryByText("Beta Health")).not.toBeInTheDocument();
    });

    it("filtra por etapa original de origen", async () => {
      render(<ArchivePage initialOpportunities={mockArchivedOpportunities} />);

      const stageSelect = screen.getByLabelText(/Filtrar por etapa original/i);
      expect(stageSelect).toBeInTheDocument();

      // Filtrar por ProposalSent
      fireEvent.change(stageSelect, { target: { value: "ProposalSent" } });

      expect(screen.getByText("Beta Health")).toBeInTheDocument();
      expect(screen.queryByText("Alpha Logistics")).not.toBeInTheDocument();
      expect(screen.queryByText("Gamma Retail")).not.toBeInTheDocument();
      expect(screen.queryByText("Delta Logistics Corp")).not.toBeInTheDocument();
    });

    it("permite limpiar todos los filtros aplicados", async () => {
      const user = userEvent.setup();
      render(<ArchivePage initialOpportunities={mockArchivedOpportunities} />);

      const searchInput = screen.getByPlaceholderText(/Buscar por cliente o descripción/i);
      await user.type(searchInput, "Beta");

      expect(screen.getByText("Beta Health")).toBeInTheDocument();
      expect(screen.queryByText("Alpha Logistics")).not.toBeInTheDocument();

      const clearBtn = screen.getByRole("button", { name: /Limpiar filtros|Restablecer/i });
      await user.click(clearBtn);

      expect(screen.getByText("Alpha Logistics")).toBeInTheDocument();
      expect(screen.getByText("Beta Health")).toBeInTheDocument();
      expect(searchInput).toHaveValue("");
    });
  });

  describe("4. Acción de Restitución (Desarchivo)", () => {
    it("dispone de un botón accesible 'Restaurar deal' / 'Desarchivar' para cada oportunidad", () => {
      render(<ArchivePage initialOpportunities={mockArchivedOpportunities} />);

      const restoreButtons = screen.getAllByRole("button", {
        name: /Restaurar deal|Desarchivar/i,
      });
      expect(restoreButtons).toHaveLength(mockArchivedOpportunities.length);
    });

    it("llama a la acción de restitución, remueve el deal de la lista y muestra feedback de éxito", async () => {
      const user = userEvent.setup();
      const onRestore = vi.fn().mockResolvedValue(undefined);

      render(
        <ArchivePage
          initialOpportunities={mockArchivedOpportunities}
          onRestore={onRestore}
        />,
      );

      const itemAlpha = screen.getByTestId("archived-deal-opp-arch-1");
      const restoreBtn = within(itemAlpha).getByRole("button", {
        name: /Restaurar deal|Desarchivar/i,
      });

      await user.click(restoreBtn);

      expect(onRestore).toHaveBeenCalledWith("opp-arch-1");

      await waitFor(() => {
        expect(screen.queryByText("Alpha Logistics")).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(/Oportunidad restaurada exitosamente/i),
      ).toBeInTheDocument();
    });

    it("invoca POST /api/opportunities/[id]/archive con isArchived: false por defecto cuando no se inyecta onRestore", async () => {
      const user = userEvent.setup();

      // Mock de fetch global
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockArchivedOpportunities[1],
            isArchived: false,
          },
        }),
      });
      global.fetch = mockFetch;

      render(<ArchivePage initialOpportunities={[mockArchivedOpportunities[1]]} />);

      const restoreBtn = screen.getByRole("button", {
        name: /Restaurar deal|Desarchivar/i,
      });
      await user.click(restoreBtn);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/opportunities/opp-arch-2/archive",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: false }),
        }),
      );

      await waitFor(() => {
        expect(screen.queryByText("Beta Health")).not.toBeInTheDocument();
      });
    });

    it("muestra mensaje de error si la restitución falla", async () => {
      const user = userEvent.setup();
      const onRestore = vi.fn().mockRejectedValue(new Error("Fallo de red al restaurar"));

      render(
        <ArchivePage
          initialOpportunities={[mockArchivedOpportunities[0]]}
          onRestore={onRestore}
        />,
      );

      const restoreBtn = screen.getByRole("button", {
        name: /Restaurar deal|Desarchivar/i,
      });
      await user.click(restoreBtn);

      await waitFor(() => {
        expect(screen.getByText(/Fallo de red al restaurar/i)).toBeInTheDocument();
      });
      // El elemento debe permanecer si falló
      expect(screen.getByText("Alpha Logistics")).toBeInTheDocument();
    });
  });

  describe("5. Accesibilidad (WCAG 2.2 AA)", () => {
    it("incluye atributos aria apropiados y foco accesible visible", () => {
      render(<ArchivePage initialOpportunities={mockArchivedOpportunities} />);

      const heading = screen.getByRole("heading", {
        level: 1,
        name: /Oportunidades Archivadas|Archivo Comercial/i,
      });
      expect(heading).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(/Buscar por cliente o descripción/i);
      expect(searchInput).toHaveAttribute("type", "text");
      expect(searchInput.className).toMatch(/focus-visible:ring/);
    });
  });
});
