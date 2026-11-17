// src/lib/validations/auth.schema.ts
// Esquemas Zod para los Route Handlers de autenticación (F05-T01).
// Validación de payloads de registro y login en el borde de la API (400 en fallo).

import { z } from "zod";

/**
 * Payload de registro: nombre opcional, email con formato y contraseña mínima de 8.
 */
export const RegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre no puede estar vacío")
    .max(100, "Máximo 100 caracteres")
    .optional(),
  email: z
    .string({ required_error: "El correo es requerido" })
    .trim()
    .toLowerCase()
    .email("Correo inválido"),
  password: z
    .string({ required_error: "La contraseña es requerida" })
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "Máximo 128 caracteres"),
});

/**
 * Payload de login: email con formato y contraseña presente.
 * No se valida la longitud de la contraseña para no filtrar la política
 * en el intento de acceso (la respuesta uniforme es 401 INVALID_CREDENTIALS).
 */
export const LoginSchema = z.object({
  email: z
    .string({ required_error: "El correo es requerido" })
    .trim()
    .toLowerCase()
    .email("Correo inválido"),
  password: z
    .string({ required_error: "La contraseña es requerida" })
    .min(1, "La contraseña es requerida"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
