// src/lib/format-currency.ts
// M-1 (F05-T01 loop 2/3) — Formateador compartido de moneda.
//
// La aplicación usa PEN (soles peruanos) fijo, con el símbolo literal "S/." en
// todas las superficies monetarias. No hay selector, preferencia persistida ni conversión.
//
// Reglas de diseño:
// - El símbolo se emite EXPLÍCITAMENTE por este módulo; no se confía en que
//   `Intl.NumberFormat` produzca exactamente "S/." por defecto (no lo garantiza).
// - La salida es determinista y estable: mismo valor -> mismo string.
// - Función pura: no depende de estado global, red, reloj ni zona horaria.
// - No hay conversión de divisas ni redondeo de negocio: el valor numérico se
//   preserva (se muestran como mínimo 2 decimales y hasta 20, sin truncar el valor).
//
// Usar `formatPEN` en toda superficie monetaria.

/** Locale de presentación para el Perú. */
export const PEN_LOCALE = "es-PE";

/** Símbolo monetario literal de presentation (no el resultado por defecto de Intl). */
export const PEN_SYMBOL = "S/.";

// Formateador numérico decimal (sin símbolo): el símbolo lo agrega este módulo.
// - minimumFractionDigits: 2  -> presentation consistente de importes (0 -> "0.00").
// - maximumFractionDigits: 20 -> no se pierde precision del valor almacenado.
const decimalFormatter = new Intl.NumberFormat(PEN_LOCALE, {
  style: "decimal",
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 20,
});

/**
 * Formatea un importe en soles peruanos con el simbolo literal "S/.".
 *
 * @param amount Importe numerico (sin unidades, sin conversion).
 * @returns String determinista, p. ej. "S/. 1,500.50" / "-S/. 1,500.50".
 * @throws TypeError si `amount` no es un numero finito.
 */
export function formatPEN(amount: number): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new TypeError(
      "formatPEN requiere un importe numerico finito (PEN, sin conversion)",
    );
  }

  const isNegative = amount < 0;
  // Math.abs evita el signo negativo heredado del formateador para recomponerlo
  // de forma explicita y estable delante del simbolo.
  const formatted = decimalFormatter.format(Math.abs(amount));

  return isNegative
    ? `-${PEN_SYMBOL} ${formatted}`
    : `${PEN_SYMBOL} ${formatted}`;
}
