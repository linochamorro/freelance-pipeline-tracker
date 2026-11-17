import { describe, it, expect } from "vitest";
import {
  DEVELOPMENT_STATUSES,
  PAYMENT_STATUSES,
  DEVELOPMENT_ACTIVATION_STAGE,
  PAYMENT_ACTIVATION_STAGE,
  isValidDevelopmentStatus,
  isValidPaymentStatus,
  canActivateDevelopmentStatus,
  canActivatePaymentStatus,
  getAllowedDevelopmentStatuses,
  getAllowedPaymentStatuses,
} from "../../../src/lib/rules/substate-activation";

describe("Reglas puras de activación de subestados (F01-T05)", () => {
  describe("DevelopmentStatus: 4 valores canónicos", () => {
    it("DEVELOPMENT_STATUSES contiene exactamente NotStarted, InProgress, InReview, Delivered", () => {
      expect(DEVELOPMENT_STATUSES).toEqual([
        "NotStarted",
        "InProgress",
        "InReview",
        "Delivered",
      ]);
    });

    it("DEVELOPMENT_STATUSES tiene exactamente 4 elementos", () => {
      expect(DEVELOPMENT_STATUSES).toHaveLength(4);
    });

    it("DEVELOPMENT_ACTIVATION_STAGE es Accepted", () => {
      expect(DEVELOPMENT_ACTIVATION_STAGE).toBe("Accepted");
    });

    it("isValidDevelopmentStatus acepta cada valor canónico", () => {
      for (const status of DEVELOPMENT_STATUSES) {
        expect(isValidDevelopmentStatus(status)).toBe(true);
      }
    });

    it("isValidDevelopmentStatus rechaza valores inválidos", () => {
      expect(isValidDevelopmentStatus("")).toBe(false);
      expect(isValidDevelopmentStatus("Iniciado" as any)).toBe(false);
      expect(isValidDevelopmentStatus("Completed" as any)).toBe(false);
      expect(isValidDevelopmentStatus(null as any)).toBe(false);
      expect(isValidDevelopmentStatus(undefined as any)).toBe(false);
    });
  });

  describe("PaymentStatus: 4 valores canónicos", () => {
    it("PAYMENT_STATUSES contiene exactamente Pending, PartialPaid, Paid, Refunded", () => {
      expect(PAYMENT_STATUSES).toEqual([
        "Pending",
        "PartialPaid",
        "Paid",
        "Refunded",
      ]);
    });

    it("PAYMENT_STATUSES tiene exactamente 4 elementos", () => {
      expect(PAYMENT_STATUSES).toHaveLength(4);
    });

    it("PAYMENT_ACTIVATION_STAGE es ProposalSent", () => {
      expect(PAYMENT_ACTIVATION_STAGE).toBe("ProposalSent");
    });

    it("isValidPaymentStatus acepta cada valor canónico", () => {
      for (const status of PAYMENT_STATUSES) {
        expect(isValidPaymentStatus(status)).toBe(true);
      }
    });

    it("isValidPaymentStatus rechaza valores inválidos", () => {
      expect(isValidPaymentStatus("")).toBe(false);
      expect(isValidPaymentStatus("Pagado" as any)).toBe(false);
      expect(isValidPaymentStatus("NotStarted" as any)).toBe(false);
      expect(isValidPaymentStatus(null as any)).toBe(false);
      expect(isValidPaymentStatus(undefined as any)).toBe(false);
    });
  });

  describe("Activación de DevelopmentStatus solo desde Accepted", () => {
    it("canActivateDevelopmentStatus devuelve true para cada status cuando stage es Accepted", () => {
      for (const status of DEVELOPMENT_STATUSES) {
        expect(canActivateDevelopmentStatus("Accepted", status)).toBe(true);
      }
    });

    it("canActivateDevelopmentStatus devuelve false desde cualquier etapa distinta de Accepted", () => {
      const otherStages = [
        "Lead",
        "Contacted",
        "MeetingScheduled",
        "BriefReceived",
        "ProposalSent",
        "Negotiation",
        "InProgress",
        "Completed",
        "Rejected",
      ];
      for (const stage of otherStages) {
        for (const status of DEVELOPMENT_STATUSES) {
          expect(canActivateDevelopmentStatus(stage, status)).toBe(false);
        }
      }
    });

    it("canActivateDevelopmentStatus rechaza status inválido incluso desde Accepted", () => {
      expect(canActivateDevelopmentStatus("Accepted", "Iniciado" as any)).toBe(
        false,
      );
      expect(canActivateDevelopmentStatus("Accepted", "" as any)).toBe(false);
    });

    it("canActivateDevelopmentStatus rechaza stage inválido", () => {
      expect(canActivateDevelopmentStatus("", "NotStarted")).toBe(false);
      expect(canActivateDevelopmentStatus("On Hold", "NotStarted")).toBe(false);
    });
  });

  describe("Activación de PaymentStatus solo desde ProposalSent", () => {
    it("canActivatePaymentStatus devuelve true para cada status cuando stage es ProposalSent", () => {
      for (const status of PAYMENT_STATUSES) {
        expect(canActivatePaymentStatus("ProposalSent", status)).toBe(true);
      }
    });

    it("canActivatePaymentStatus devuelve false desde cualquier etapa distinta de ProposalSent", () => {
      const otherStages = [
        "Lead",
        "Contacted",
        "MeetingScheduled",
        "BriefReceived",
        "Accepted",
        "Negotiation",
        "InProgress",
        "Completed",
        "Rejected",
      ];
      for (const stage of otherStages) {
        for (const status of PAYMENT_STATUSES) {
          expect(canActivatePaymentStatus(stage, status)).toBe(false);
        }
      }
    });

    it("canActivatePaymentStatus rechaza status inválido incluso desde ProposalSent", () => {
      expect(canActivatePaymentStatus("ProposalSent", "Pagado" as any)).toBe(
        false,
      );
      expect(canActivatePaymentStatus("ProposalSent", "" as any)).toBe(false);
    });

    it("canActivatePaymentStatus rechaza stage inválido", () => {
      expect(canActivatePaymentStatus("", "Pending")).toBe(false);
      expect(canActivatePaymentStatus("On Hold", "Pending")).toBe(false);
    });
  });

  describe("Listados permitidos por etapa", () => {
    it("getAllowedDevelopmentStatuses devuelve los 4 status solo desde Accepted", () => {
      expect(getAllowedDevelopmentStatuses("Accepted")).toEqual(
        DEVELOPMENT_STATUSES,
      );
      expect(getAllowedDevelopmentStatuses("ProposalSent")).toEqual([]);
      expect(getAllowedDevelopmentStatuses("InProgress")).toEqual([]);
      expect(getAllowedDevelopmentStatuses("Completed")).toEqual([]);
      expect(getAllowedDevelopmentStatuses("Rejected")).toEqual([]);
      expect(getAllowedDevelopmentStatuses("Lead")).toEqual([]);
    });

    it("getAllowedPaymentStatuses devuelve los 4 status solo desde ProposalSent", () => {
      expect(getAllowedPaymentStatuses("ProposalSent")).toEqual(
        PAYMENT_STATUSES,
      );
      expect(getAllowedPaymentStatuses("Accepted")).toEqual([]);
      expect(getAllowedPaymentStatuses("Negotiation")).toEqual([]);
      expect(getAllowedPaymentStatuses("InProgress")).toEqual([]);
      expect(getAllowedPaymentStatuses("Lead")).toEqual([]);
    });
  });
});
