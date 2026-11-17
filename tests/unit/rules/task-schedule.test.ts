import { describe, it, expect } from "vitest";
import {
  TASK_LEAD_MINUTES_OPTIONS,
  calculateNotificationTrigger,
  getTaskLeadMinutesOptions,
  isValidLeadMinutes,
} from "../../../src/lib/rules/task-schedule";
import type { TaskLeadMinutes } from "../../../src/lib/rules/task-schedule";

describe("Reglas puras de agenda de tareas — F01-T06, ADR-005", () => {
  describe("Conjunto cerrado de 5 opciones de adelanto (minutos)", () => {
    it("TASK_LEAD_MINUTES_OPTIONS contiene exactamente [15, 30, 60, 120, 1440]", () => {
      expect(TASK_LEAD_MINUTES_OPTIONS).toEqual([15, 30, 60, 120, 1440]);
    });

    it("getTaskLeadMinutesOptions devuelve la misma lista inmutable", () => {
      expect(getTaskLeadMinutesOptions()).toBe(TASK_LEAD_MINUTES_OPTIONS);
      expect(getTaskLeadMinutesOptions()).toHaveLength(5);
    });

    it("no contiene opciones adicionales ni repetidas", () => {
      const unicos = new Set(TASK_LEAD_MINUTES_OPTIONS);
      expect(unicos.size).toBe(5);
      expect(unicos.size).toBe(TASK_LEAD_MINUTES_OPTIONS.length);
    });
  });

  describe("Validación de leadMinutes", () => {
    it.each([15, 30, 60, 120, 1440])(
      "isValidLeadMinutes acepta %i minutos",
      (value) => {
        expect(isValidLeadMinutes(value)).toBe(true);
      },
    );

    it("isValidLeadMinutes rechaza valores fuera del conjunto cerrado", () => {
      expect(isValidLeadMinutes(0)).toBe(false);
      expect(isValidLeadMinutes(10)).toBe(false);
      expect(isValidLeadMinutes(45)).toBe(false);
      expect(isValidLeadMinutes(90)).toBe(false);
      expect(isValidLeadMinutes(1439)).toBe(false);
      expect(isValidLeadMinutes(1441)).toBe(false);
      expect(isValidLeadMinutes(-15)).toBe(false);
      expect(isValidLeadMinutes(NaN)).toBe(false);
    });
  });

  describe("calculateNotificationTrigger", () => {
    const dueDate = new Date("2026-11-12T14:00:00Z");

    it("15 minutos antes: trigger a las 13:45", () => {
      const trigger = calculateNotificationTrigger(dueDate, 15);
      expect(trigger.getTime()).toBe(new Date("2026-11-12T13:45:00Z").getTime());
    });

    it("30 minutos antes: trigger a las 13:30", () => {
      const trigger = calculateNotificationTrigger(dueDate, 30);
      expect(trigger.getTime()).toBe(new Date("2026-11-12T13:30:00Z").getTime());
    });

    it("60 minutos antes: trigger a las 13:00", () => {
      const trigger = calculateNotificationTrigger(dueDate, 60);
      expect(trigger.getTime()).toBe(new Date("2026-11-12T13:00:00Z").getTime());
    });

    it("120 minutos antes: trigger a las 12:00", () => {
      const trigger = calculateNotificationTrigger(dueDate, 120);
      expect(trigger.getTime()).toBe(new Date("2026-11-12T12:00:00Z").getTime());
    });

    it("1440 minutos (1 día) antes: trigger al día anterior 14:00", () => {
      const trigger = calculateNotificationTrigger(dueDate, 1440);
      expect(trigger.getTime()).toBe(new Date("2026-11-11T14:00:00Z").getTime());
    });

    it("cruza de mes correctamente", () => {
      const dueDateMes = new Date("2026-11-01T10:00:00Z");
      const trigger = calculateNotificationTrigger(dueDateMes, 1440);
      expect(trigger.getTime()).toBe(new Date("2026-10-31T10:00:00Z").getTime());
    });

    it("no muta el objeto Date de entrada (dueDate)", () => {
      const before = dueDate.getTime();
      calculateNotificationTrigger(dueDate, 60);
      expect(dueDate.getTime()).toBe(before);
    });

    it("devuelve una nueva instancia de Date (no la misma referencia)", () => {
      const trigger = calculateNotificationTrigger(dueDate, 15);
      expect(trigger).not.toBe(dueDate);
    });

    it.each([0, 10, 45, 90, 100, 2000])(
      "lanza error para leadMinutes inválido %i",
      (value) => {
        expect(() => calculateNotificationTrigger(dueDate, value as TaskLeadMinutes)).toThrow();
      },
    );
  });
});
