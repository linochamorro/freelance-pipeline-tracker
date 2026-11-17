import { describe, it, expect } from "vitest";
import {
  PIPELINE_STAGES,
  TERMINAL_STAGES,
  isTerminalStage,
  isOnHoldStage,
  isValidStage,
  canTransition,
  getValidTransitions,
} from "../../../src/lib/rules/stage-transitions";

describe("Reglas puras de Kanban y transiciones de etapa (F01-T04)", () => {
  describe("Definición de las 10 etapas del pipeline", () => {
    it("PIPELINE_STAGES contiene exactamente las 10 etapas canónicas en orden", () => {
      expect(PIPELINE_STAGES).toEqual([
        "Lead",
        "Contacted",
        "MeetingScheduled",
        "BriefReceived",
        "ProposalSent",
        "Negotiation",
        "Accepted",
        "InProgress",
        "Completed",
        "Rejected",
      ]);
    });

    it("PIPELINE_STAGES no contiene la etapa 'On Hold'", () => {
      expect(PIPELINE_STAGES).not.toContain("On Hold");
    });

    it("isValidStage acepta cada etapa canónica", () => {
      for (const stage of PIPELINE_STAGES) {
        expect(isValidStage(stage)).toBe(true);
      }
    });

    it("isValidStage rechaza valores que no son etapa válida", () => {
      expect(isValidStage("On Hold")).toBe(false);
      expect(isValidStage("")).toBe(false);
      expect(isValidStage("Archived" as any)).toBe(false);
    });
  });

  describe("Etapas terminales: Completed y Rejected", () => {
    it("TERMINAL_STAGES contiene Completed y Rejected", () => {
      expect(TERMINAL_STAGES).toEqual(["Completed", "Rejected"]);
    });

    it("isTerminalStage devuelve true para Completed y Rejected", () => {
      expect(isTerminalStage("Completed")).toBe(true);
      expect(isTerminalStage("Rejected")).toBe(true);
    });

    it("isTerminalStage devuelve false para etapas no terminales", () => {
      for (const stage of ["Lead", "Contacted", "MeetingScheduled", "BriefReceived", "ProposalSent", "Negotiation", "Accepted", "InProgress"]) {
        expect(isTerminalStage(stage)).toBe(false);
      }
    });
  });

  describe("Ausencia de 'On Hold'", () => {
    it("isOnHoldStage devuelve false para toda etapa del pipeline", () => {
      for (const stage of PIPELINE_STAGES) {
        expect(isOnHoldStage(stage)).toBe(false);
      }
    });

    it("isOnHoldStage devuelve true solo para el valor literal 'On Hold'", () => {
      expect(isOnHoldStage("On Hold")).toBe(true);
    });
  });

  describe("Bloqueo de transiciones desde etapas terminales", () => {
    it("canTransition desde Completed hacia cualquier etapa es false", () => {
      for (const to of PIPELINE_STAGES) {
        expect(canTransition("Completed", to)).toBe(false);
      }
    });

    it("canTransition desde Rejected hacia cualquier etapa es false", () => {
      for (const to of PIPELINE_STAGES) {
        expect(canTransition("Rejected", to)).toBe(false);
      }
    });

    it("getValidTransitions desde Completed devuelve lista vacía", () => {
      expect(getValidTransitions("Completed")).toEqual([]);
    });

    it("getValidTransitions desde Rejected devuelve lista vacía", () => {
      expect(getValidTransitions("Rejected")).toEqual([]);
    });
  });

  describe("Transiciones válidas entre etapas no terminales", () => {
    it("permite avanzar un paso en el flujo lineal (Lead -> Contacted)", () => {
      expect(canTransition("Lead", "Contacted")).toBe(true);
    });

    it("permite avanzar hasta InProgress (Accepted -> InProgress)", () => {
      expect(canTransition("Accepted", "InProgress")).toBe(true);
    });

    it("permite llegar a Completed desde InProgress", () => {
      expect(canTransition("InProgress", "Completed")).toBe(true);
    });

    it("no permite saltar más de un paso hacia adelante", () => {
      expect(canTransition("Lead", "MeetingScheduled")).toBe(false);
    });

    it("permite Rechazar desde cualquier etapa no terminal", () => {
      const nonTerminals = PIPELINE_STAGES.filter(
        (s) => s !== "Completed" && s !== "Rejected",
      );
      for (const from of nonTerminals) {
        expect(canTransition(from, "Rejected")).toBe(true);
      }
    });

    it("no permite volver a una etapa anterior (retroceso bloqueado)", () => {
      expect(canTransition("Contacted", "Lead")).toBe(false);
      expect(canTransition("ProposalSent", "MeetingScheduled")).toBe(false);
    });
  });

  describe("Transiciones inválidas", () => {
    it("rechaza transicionar a 'On Hold'", () => {
      expect(canTransition("Lead", "On Hold")).toBe(false);
      expect(canTransition("Negotiation", "On Hold")).toBe(false);
    });

    it("rechaza transiciones desde etapa terminal incluso hacia Rejected", () => {
      expect(canTransition("Completed", "Rejected")).toBe(false);
      expect(canTransition("Rejected", "Completed")).toBe(false);
    });

    it("rechaza transicionar a una etapa inexistente", () => {
      expect(canTransition("Lead", "On Hold" as any)).toBe(false);
      expect(canTransition("Lead", "Archived" as any)).toBe(false);
    });
  });
});
