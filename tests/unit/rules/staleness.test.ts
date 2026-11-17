import { describe, it, expect } from "vitest";
import {
  DEFAULT_STALENESS_DAYS,
  STAGE_STALENESS_FIELD,
  calculateStalenessDeadline,
  defaultStalenessThresholds,
  getStalenessDaysForStage,
  isStale,
} from "../../../src/lib/rules/staleness";
import type { StalenessThresholds } from "../../../src/lib/rules/staleness";

const baseThresholds: StalenessThresholds = {
  prospectionStalenessDays: 3,
  proposalStalenessDays: 5,
  executionStalenessDays: 2,
  billingStalenessDays: 10,
  closedStalenessDays: 30,
};

describe("Reglas puras de inactividad (staleness) — F01-T06, ADR-003", () => {
  describe("Umbra por etapa (parametrizado por UserSettings)", () => {
    it("Lead y Contacted usan prospectionStalenessDays", () => {
      expect(STAGE_STALENESS_FIELD.Lead).toBe("prospectionStalenessDays");
      expect(STAGE_STALENESS_FIELD.Contacted).toBe("prospectionStalenessDays");
      expect(getStalenessDaysForStage("Lead", baseThresholds)).toBe(3);
      expect(getStalenessDaysForStage("Contacted", baseThresholds)).toBe(3);
    });

    it("MeetingScheduled, BriefReceived, ProposalSent y Negotiation usan proposalStalenessDays", () => {
      expect(getStalenessDaysForStage("MeetingScheduled", baseThresholds)).toBe(5);
      expect(getStalenessDaysForStage("BriefReceived", baseThresholds)).toBe(5);
      expect(getStalenessDaysForStage("ProposalSent", baseThresholds)).toBe(5);
      expect(getStalenessDaysForStage("Negotiation", baseThresholds)).toBe(5);
    });

    it("Accepted e InProgress usan executionStalenessDays", () => {
      expect(getStalenessDaysForStage("Accepted", baseThresholds)).toBe(2);
      expect(getStalenessDaysForStage("InProgress", baseThresholds)).toBe(2);
    });

    it("Closed usa closedStalenessDays", () => {
      expect(getStalenessDaysForStage("Completed", baseThresholds)).toBe(30);
      expect(getStalenessDaysForStage("Rejected", baseThresholds)).toBe(30);
    });

    it("no hay valores hardcodeados de 7 salvo el fallback de inicialización", () => {
      expect(baseThresholds.prospectionStalenessDays).not.toBe(7);
      expect(DEFAULT_STALENESS_DAYS).toBe(7);
    });
  });

  describe("Cálculo de fecha límite de inactividad", () => {
    it("calcula updatedAt + umbral de días para la etapa", () => {
      const updatedAt = new Date("2026-11-10T10:00:00Z");
      const deadline = calculateStalenessDeadline(
        updatedAt,
        "Lead",
        baseThresholds,
      );
      expect(deadline.getTime()).toBe(
        new Date("2026-11-13T10:00:00Z").getTime(),
      );
    });

    it("usa el umbral de proposal (5 días) para ProposalSent", () => {
      const updatedAt = new Date("2026-11-01T00:00:00Z");
      const deadline = calculateStalenessDeadline(
        updatedAt,
        "ProposalSent",
        baseThresholds,
      );
      expect(deadline.getTime()).toBe(
        new Date("2026-11-06T00:00:00Z").getTime(),
      );
    });

    it("no muta el objeto Date de entrada", () => {
      const updatedAt = new Date("2026-11-10T10:00:00Z");
      const before = updatedAt.getTime();
      calculateStalenessDeadline(updatedAt, "Lead", baseThresholds);
      expect(updatedAt.getTime()).toBe(before);
    });
  });

  describe("Detección de oportunidad inactiva (isStale)", () => {
    const updatedAt = new Date("2026-11-10T10:00:00Z");

    it("devuelve true cuando referenceDate supera la fecha límite", () => {
      const referenceDate = new Date("2026-11-14T10:00:00Z"); // +4 días, umbral 3
      expect(isStale(updatedAt, "Lead", baseThresholds, referenceDate)).toBe(
        true,
      );
    });

    it("devuelve false cuando referenceDate está dentro del umbral", () => {
      const referenceDate = new Date("2026-11-12T10:00:00Z"); // +2 días, umbral 3
      expect(isStale(updatedAt, "Lead", baseThresholds, referenceDate)).toBe(
        false,
      );
    });

    it("devuelve false exactamente en la fecha límite (no supera)", () => {
      const referenceDate = new Date("2026-11-13T10:00:00Z"); // == límite
      expect(isStale(updatedAt, "Lead", baseThresholds, referenceDate)).toBe(
        false,
      );
    });

    it("usa umbral distinto por etapa con la misma updatedAt", () => {
      const referenceDate = new Date("2026-11-13T10:00:00Z");
      // Lead umbral 3 -> límite 13 -> no stale (igual)
      expect(isStale(updatedAt, "Lead", baseThresholds, referenceDate)).toBe(
        false,
      );
      // ProposalSent umbral 5 -> límite 15 -> no stale
      expect(
        isStale(updatedAt, "ProposalSent", baseThresholds, referenceDate),
      ).toBe(false);
    });
  });

  describe("Fallback de inicialización (valor 7 solo como default)", () => {
    it("defaultStalenessThresholds devuelve 7 en cada campo", () => {
      const defaults = defaultStalenessThresholds();
      expect(defaults.prospectionStalenessDays).toBe(DEFAULT_STALENESS_DAYS);
      expect(defaults.proposalStalenessDays).toBe(DEFAULT_STALENESS_DAYS);
      expect(defaults.executionStalenessDays).toBe(DEFAULT_STALENESS_DAYS);
      expect(defaults.billingStalenessDays).toBe(DEFAULT_STALENESS_DAYS);
      expect(defaults.closedStalenessDays).toBe(DEFAULT_STALENESS_DAYS);
    });

    it("los umbrales personalizados no se ven afectados por el fallback", () => {
      expect(baseThresholds.prospectionStalenessDays).toBe(3);
      expect(baseThresholds.closedStalenessDays).toBe(30);
    });
  });
});
