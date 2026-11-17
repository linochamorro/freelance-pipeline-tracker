// src/lib/api-response.ts
// Contrato estandarizado de respuesta de API (Arquitectura 04)
// Todas las respuestas de API devuelven este formato JSON estandarizado.

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<never> {
  return { success: false, error: { code, message, details } };
}

// ---------------------------------------------------------------------------
// H-2 (F05-T01 loop 2/3): clasificación y saneamiento de errores de ruta.
//
// Principio: CLASIFICAR PRIMERO (404 vs 500/sobre el error original) y SANEAR
// DESPUÉS. La clasificación usa una lista cerrada de señales de dominio sobre
// el error original; la respuesta al cliente nunca incluye texto de excepción
// interna (Prisma, driver, rutas, host).
//
// Deuda documentada: las señales son textuales porque los servicios lanzan
// Error con mensajes en español y `prisma/schema.prisma` está congelado. La
// solución estructural (códigos de error de dominio) queda como propuesta
// futura; no se tocan los servicios en este bucle.
// ---------------------------------------------------------------------------

export interface ErrorResponseFallback {
  status: 400 | 500;
  code: string;
  message: string;
}

export interface ErrorResponseResult {
  status: number;
  body: ApiResponse<never>;
}

/**
 * Lista cerrada de señales de dominio que indican que el recurso no existe o
 * no pertenece al usuario (IDOR). Se evalúan sobre el error ORIGINAL, antes de
 * sanear. Es una lista cerrada (no una coincidencia genérica) para evitar
 * falsos 404 a partir de texto interno.
 */
const NOT_FOUND_SIGNALS: readonly string[] = [
  "no encontrada",
  "no autorizado",
  "acceso denegado",
  "no pertenece al usuario",
];

/**
 * Lista cerrada de mensajes de dominio controlados (validaciones de servicio)
 * que pueden mostrarse a clientes: no contienen detalle interno. Cualquier
 * otro error se sustituye por el mensaje fijo del fallback.
 */
const SAFE_DOMAIN_MESSAGE_SIGNALS: readonly string[] = [
  "Oportunidad no encontrada",
  "Tarea no encontrada",
  "userId es requerido",
  "clientName es requerido",
  "description es requerida",
  "contactPersonName es requerido",
  "estimatedBudget debe ser",
  "Canal de contacto inválido",
  "Etapa de pipeline inválida",
  "La etapa 'On Hold'",
  "No se puede crear una oportunidad",
  "No se puede activar el estado",
  "Transición inválida",
  "El contenido de la nota",
  "leadMinutes inválido",
];

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "";
}

function matchesAny(message: string, signals: readonly string[]): boolean {
  return signals.some((signal) => message.includes(signal));
}

/**
 * Clasifica el error original (404 vs fallback) y construye la respuesta ya
 * saneada. El mensaje y los `details` que salen al cliente no derivan de
 * `err.message`/`err.stack` de una excepción no prevista.
 */
export function toErrorResponse(
  err: unknown,
  fallback: ErrorResponseFallback,
): ErrorResponseResult {
  const message = getErrorMessage(err);

  // 1) Clasificación sobre el error original, antes de sanear.
  if (matchesAny(message, NOT_FOUND_SIGNALS)) {
    return { status: 404, body: fail("NOT_FOUND", "Recurso no encontrado") };
  }

  // 2) Saneamiento: solo se emiten mensajes de dominio controlados; el resto
  //    se sustituye por el mensaje fijo del fallback (sin detalle interno).
  const safeDomainMessage = matchesAny(message, SAFE_DOMAIN_MESSAGE_SIGNALS);
  return {
    status: fallback.status,
    body: fail(fallback.code, safeDomainMessage ? message : fallback.message),
  };
}

