import { describe, it, expect } from "vitest";
import { InMemoryEmailAdapter, ResendEmailAdapter } from "../../../src/lib/email-adapter";

describe("InMemoryEmailAdapter (stub, ADR-007)", () => {
  it("comienza con el arreglo de envíos vacío", () => {
    const adapter = new InMemoryEmailAdapter();
    expect(adapter.sent).toEqual([]);
  });

  it("captura cada envío en el arreglo sent sin red externa", async () => {
    const adapter = new InMemoryEmailAdapter();
    await adapter.sendEmail({
      to: "cliente@example.com",
      subject: "Recordatorio de tarea",
      html: "<p>Hola</p>",
      text: "Hola",
    });
    await adapter.sendEmail({
      to: "otro@example.com",
      subject: "Segundo aviso",
      html: "<p>Adiós</p>",
      text: "Adiós",
    });

    expect(adapter.sent).toHaveLength(2);
    expect(adapter.sent[0]).toEqual({
      to: "cliente@example.com",
      subject: "Recordatorio de tarea",
      html: "<p>Hola</p>",
      text: "Hola",
    });
    expect(adapter.sent[1].to).toBe("otro@example.com");
  });
});

describe("ResendEmailAdapter (producción, ADR-007)", () => {
  it("expone la clase de producción", () => {
    expect(ResendEmailAdapter).toBeDefined();
    expect(typeof ResendEmailAdapter).toBe("function");
  });
});
