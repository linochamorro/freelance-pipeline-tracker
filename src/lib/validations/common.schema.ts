// src/lib/validations/common.schema.ts
// Refinements y esquemas base compartidos entre validaciones de API.

import { z } from "zod";

// Identificador generado por Prisma (cuid / uuid). No vacío.
export const IdSchema = z.string().cuid("Identificador inválido");

// Presupuesto monetario: número no negativo.
export const NonNegativeMoneySchema = z
  .number()
  .nonnegative("El monto no puede ser negativo")
  .finite("El monto debe ser un número finito");

// Texto obligatorio con longitud mínima.
export const RequiredTextSchema = (min = 1, max = 5000) =>
  z
    .string({ required_error: "Campo de texto requerido" })
    .min(min, `Mínimo ${min} caracteres`)
    .max(max, `Máximo ${max} caracteres`);

// Opcional de texto (permitido vacío o undefined).
export const OptionalTextSchema = (max = 5000) =>
  z.string().max(max).optional().nullable();
