// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MetricsCards } from "../../../src/components/dashboard/metrics-cards";
import { StaleDealsList } from "../../../src/components/dashboard/stale-deals-list";
import { SettingsForm } from "../../../src/components/dashboard/settings-form";
import type { DashboardMetrics } from "../../../src/services/dashboard-service";
import type { UserSettings } from "../../../src/types";

const baseMetrics: DashboardMetrics = {
  pipelineValue: 15000,
  conversionRate: 40,
  activeDeals: 3,
  staleDeals: [
    {
      id: "opp-1",
      clientName: "Acme Corp",
      pipelineStage: "Lead",
      updatedAt: new Date("2026-11-01T10:00:00Z"),
      daysOverdue: 5,
    },
  ],
};

const baseSettings: UserSettings = {
  id: "c1234567890123456789012345",
  userId: "u1",
  prospectionStalenessDays: 7,
  proposalStalenessDays: 7,
  executionStalenessDays: 7,
  billingStalenessDays: 7,
  closedStalenessDays: 7,
  notificationEnabled: true,
};

describe("UI de Dashboard y Ajustes — accesibilidad (F04-T03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MetricsCards", () => {
    it("renderiza las métricas clave en regiones accesibles", () => {
      render(<MetricsCards metrics={baseMetrics} />);
      expect(
        screen.getByLabelText("tarjeta de métrica valor del pipeline"),
      ).toBeTruthy();
      expect(
        screen.getByLabelText("tarjeta de métrica tasa de conversión"),
      ).toBeTruthy();
      expect(
        screen.getByLabelText("tarjeta de métrica deals activos"),
      ).toBeTruthy();
      expect(
        screen.getByLabelText("tarjeta de métrica deals inactivos"),
      ).toBeTruthy();
    });

    it("muestra la tasa de conversión y deals activos con sus valores", () => {
      render(<MetricsCards metrics={baseMetrics} />);
      expect(screen.getByText("40%")).toBeTruthy();
      expect(screen.getByText("3")).toBeTruthy();
    });
  });

  describe("StaleDealsList", () => {
    it("renderiza estado vacío accesible cuando no hay deals inactivos", () => {
      render(<StaleDealsList staleDeals={[]} />);
      expect(screen.getByText("No hay deals inactivos")).toBeTruthy();
    });

    it("renderiza tabla accesible con cabeceras asociadas", () => {
      render(<StaleDealsList staleDeals={baseMetrics.staleDeals} />);
      expect(screen.getByRole("grid")).toBeTruthy();
      expect(screen.getByText("Acme Corp")).toBeTruthy();
      expect(screen.getByText("Lead")).toBeTruthy();
      expect(screen.getByText("Cliente")).toBeTruthy();
      expect(screen.getByText("Etapa")).toBeTruthy();
      expect(screen.getByText("Días de retraso")).toBeTruthy();
    });
  });

  describe("SettingsForm", () => {
    it("renderiza los 5 umbrales de inactividad y ningún selector de moneda", () => {
      render(<SettingsForm settings={baseSettings} onSubmit={vi.fn()} />);
      expect(screen.getByLabelText("Prospectación (días)")).toBeTruthy();
      expect(screen.getByLabelText("Propuesta (días)")).toBeTruthy();
      expect(screen.getByLabelText("Ejecución (días)")).toBeTruthy();
      expect(screen.getByLabelText("Facturación (días)")).toBeTruthy();
      expect(screen.getByLabelText("Cerrado (días)")).toBeTruthy();
      // M-3 (F05-T01 loop 2/3): PEN es fijo; no hay preferencia de moneda.
      expect(screen.queryByLabelText("Moneda preferida")).toBeNull();
      expect(screen.queryByRole("combobox")).toBeNull();
    });

    it("muestra error visual cuando un umbral supera 365 días", async () => {
      const onSubmit = vi.fn();
      render(<SettingsForm settings={baseSettings} onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText("Prospectación (días)"), {
        target: { value: "400" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar configuración/i }),
      );
      await waitFor(() => {
        expect(screen.getByText("Máximo 365 días")).toBeTruthy();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("muestra error visual cuando un umbral es menor a 1 día", async () => {
      const onSubmit = vi.fn();
      render(<SettingsForm settings={baseSettings} onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText("Propuesta (días)"), {
        target: { value: "0" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar configuración/i }),
      );
      await waitFor(() => {
        expect(screen.getByText("Mínimo 1 día")).toBeTruthy();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("envía umbrales válidos sin preferencia de moneda al callback onSubmit", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<SettingsForm settings={baseSettings} onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText("Prospectación (días)"), {
        target: { value: "14" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar configuración/i }),
      );
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            prospectionStalenessDays: 14,
            notificationEnabled: true,
          }),
        );
      });
      const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
      expect(payload).not.toHaveProperty("currency");
    });
  });
});
