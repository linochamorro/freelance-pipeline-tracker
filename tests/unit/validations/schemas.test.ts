import { describe, it, expect } from "vitest";
import {
  OpportunityCreateSchema,
  OpportunityUpdateSchema,
  TaskCreateSchema,
  TaskUpdateSchema,
  SettingsUpdateSchema,
} from "../../../src/lib/validations";

describe("Esquemas Zod de validación (F01-T03)", () => {
  describe("OpportunityCreateSchema", () => {
    it("acepta una oportunidad válida", () => {
      const input = {
        clientName: "Acme Corp",
        description: "Desarrollo de sitio web",
        estimatedBudget: 5000,
        contactPersonName: "Juan Pérez",
        contactChannel: "Email",
        pipelineStage: "Lead",
      };
      const result = OpportunityCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contactChannel).toBe("Email");
      }
    });

    it("rechaza canal de contacto inválido", () => {
      const input = {
        clientName: "Acme",
        description: "x",
        estimatedBudget: 100,
        contactPersonName: "Juan",
        contactChannel: "Fax" as any,
      };
      const result = OpportunityCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rechaza presupuesto negativo", () => {
      const input = {
        clientName: "Acme",
        description: "x",
        estimatedBudget: -100,
        contactPersonName: "Juan",
        contactChannel: "Email",
      };
      const result = OpportunityCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("TaskCreateSchema (ADR-005: 5 opciones de adelanto)", () => {
    it("acepta cada opción de adelanto válida", () => {
      for (const lead of [15, 30, 60, 120, 1440]) {
        const result = TaskCreateSchema.safeParse({
          title: "Tarea",
          description: "desc",
          dueDate: "2026-12-01T10:00:00Z",
          leadMinutes: lead,
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.leadMinutes).toBe(lead);
      }
    });

    it("rechaza adelanto fuera del conjunto cerrado", () => {
      const result = TaskCreateSchema.safeParse({
        title: "Tarea",
        description: "desc",
        dueDate: "2026-12-01T10:00:00Z",
        leadMinutes: 45,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza fecha límite inválida", () => {
      const result = TaskCreateSchema.safeParse({
        title: "Tarea",
        description: "desc",
        dueDate: "no-es-una-fecha",
        leadMinutes: 30,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("SettingsUpdateSchema (ADR-003: staleness configurable)", () => {
    it("acepta actualización parcial de umbrales", () => {
      const result = SettingsUpdateSchema.safeParse({
        id: "c1234567890123456789012345",
        prospectionStalenessDays: 14,
        notificationEnabled: false,
      });
      expect(result.success).toBe(true);
    });

    it("rechaza días de inactividad fuera de rango", () => {
      const result = SettingsUpdateSchema.safeParse({
        id: "c1234567890123456789012345",
        prospectionStalenessDays: 400,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Oportunidad update", () => {
    it("acepta id válido tipo cuid", () => {
      const result = OpportunityUpdateSchema.safeParse({
        id: "c1234567890123456789012345",
        isArchived: true,
      });
      expect(result.success).toBe(true);
    });
  });
});
