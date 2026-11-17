// tests/unit/lib/format-currency.test.ts
// M-1 (F05-T01 loop 2/3): formateador compartido de moneda PEN fija.
// Decisión de Lino 2026-11-14: soles peruanos, símbolo LITERAL "S/.".
//
// Las aserciones comparan contra el STRING esperado literal.
// No se reimplementa Intl ni se llama a la función bajo prueba para "calcular" el esperado.

import { describe, it, expect } from "vitest";
import {
  PEN_SYMBOL,
  PEN_LOCALE,
  formatPEN,
} from "../../../src/lib/format-currency";

describe("formatPEN — moneda PEN fija (M-1)", () => {
  it("expone el símbolo literal S/. y el locale es-PE", () => {
    expect(PEN_SYMBOL).toBe("S/.");
    expect(PEN_LOCALE).toBe("es-PE");
  });

  it("emite explícitamente el literal S/. en la salida", () => {
    expect(formatPEN(1500)).toBe("S/. 1,500.00");
    expect(formatPEN(1500).startsWith("S/.")).toBe(true);
  });

  it("formatea el cero", () => {
    expect(formatPEN(0)).toBe("S/. 0.00");
  });

  it("formatea decimales conservando el valor", () => {
    expect(formatPEN(1500.5)).toBe("S/. 1,500.50");
  });

  it("formatea números negativos", () => {
    expect(formatPEN(-1500.5)).toBe("-S/. 1,500.50");
  });

  it("usa separador de miles y separador decimal esperados", () => {
    expect(formatPEN(1234567.89)).toBe("S/. 1,234,567.89");
  });

  it("formatea agregados (suma de varios importes)", () => {
    const total = [1200, 800.5, 99.99].reduce((acc, value) => acc + value, 0);
    expect(total).toBe(2100.49);
    expect(formatPEN(total)).toBe("S/. 2,100.49");
  });

  it("no deja residuos de otras monedas ni símbolos alternativos", () => {
    const output = formatPEN(1234.5);
    expect(output).not.toContain("$");
    expect(output).not.toContain("US$");
    expect(output).not.toContain("€");
    expect(output).not.toContain("USD");
    expect(output).not.toContain("EUR");
  });

  it("es determinista y pura: llamadas repetidas producen la misma salida", () => {
    const first = formatPEN(2500.75);
    const second = formatPEN(2500.75);
    expect(first).toBe(second);
    expect(first).toBe("S/. 2,500.75");
  });

  it("rechaza valores no numéricos o no finitos de forma explícita", () => {
    expect(() => formatPEN(Number.NaN)).toThrow(TypeError);
    expect(() => formatPEN(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});
