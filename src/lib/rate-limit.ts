// src/lib/rate-limit.ts
// H-4 (F05-T01 loop 2/3): limitador de intentos en proceso para los endpoints
// de autenticación (login, register, request-reset, reset-password).
//
// LÍMITES EXPLÍCITOS (no es protección distribuida):
//   1. El estado es un Map en memoria de PROCESO: con varias instancias el
//      límite efectivo se multiplica por el número de instancias.
//   2. El estado se pierde en cada reinicio/despliegue (contadores a cero).
//   3. Evadible rotando email o IP; no protege ataques distribuidos.
//   4. Es mitigación de abuso casual/bajo caudal, no un WAF ni un control de
//      acceso. Una protección distribuida real requiere un almacén compartido.

import { createHash } from "node:crypto";
import { fail, type ApiResponse } from "./api-response";

export type RateLimitAction =
  | "login"
  | "register"
  | "request-reset"
  | "reset-password";

export interface RateLimitPolicy {
  /** Máximo de intentos permitidos por identificador (email normalizado o token). */
  identifier: number;
  /** Máximo de intentos permitidos por IP (dimensión secundaria). */
  ip: number;
  /** Ventana fija en milisegundos. */
  windowMs: number;
}

/**
 * Umbrales por acción. Constantes configurables en código (sin variable de
 * entorno nueva).
 */
export const RATE_LIMITS: Record<RateLimitAction, RateLimitPolicy> = {
  login: { identifier: 5, ip: 30, windowMs: 15 * 60 * 1000 },
  register: { identifier: 3, ip: 10, windowMs: 15 * 60 * 1000 },
  "request-reset": { identifier: 3, ip: 10, windowMs: 15 * 60 * 1000 },
  "reset-password": { identifier: 5, ip: 30, windowMs: 15 * 60 * 1000 },
};

export const RATE_LIMITED_MESSAGE =
  "Demasiados intentos. Inténtalo de nuevo más tarde.";

/** Cota máxima de entradas por contador (protección de memoria). */
export const RATE_LIMIT_MAX_ENTRIES = 5000;

interface RateLimitCounter {
  count: number;
  expiresAt: number;
}

export interface RateLimitConsumeResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(key: string): RateLimitConsumeResult;
  reset(key: string): void;
  size(): number;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Reloj inyectable (pruebas de expiración sin esperas reales). */
  now?: () => number;
  /** Cota de entradas; por defecto RATE_LIMIT_MAX_ENTRIES. */
  maxEntries?: number;
}

/**
 * Contador de ventana fija con TTL por entrada y cota de entradas.
 * Al alcanzar la cota se purgan las expiradas y, si sigue lleno, se descarta
 * la clave nueva (fail-open respecto a la memoria; nunca falla el proceso).
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const limit = options.limit;
  const windowMs = options.windowMs;
  const now = options.now ?? (() => Date.now());
  const maxEntries = options.maxEntries ?? RATE_LIMIT_MAX_ENTRIES;
  const entries = new Map<string, RateLimitCounter>();

  function purgeExpired(): void {
    const t = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= t) entries.delete(key);
    }
  }

  function consume(key: string): RateLimitConsumeResult {
    purgeExpired();
    const t = now();
    const existing = entries.get(key);

    if (!existing || existing.expiresAt <= t) {
      if (entries.size >= maxEntries) {
        // Cota de memoria: se descarta la clave nueva (fail-open), nunca crash.
        return { allowed: true, retryAfterSeconds: 0 };
      }
      entries.set(key, { count: 1, expiresAt: t + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const next = existing.count + 1;
    if (next > limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          0,
          Math.ceil((existing.expiresAt - t) / 1000),
        ),
      };
    }
    existing.count = next;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  function reset(key: string): void {
    entries.delete(key);
  }

  function size(): number {
    purgeExpired();
    return entries.size;
  }

  return { consume, reset, size };
}

/** Normaliza el identificador: NFKC + trim + minúsculas. */
export function normalizeRateLimitIdentifier(identifier: string): string {
  return identifier.normalize("NFKC").trim().toLowerCase();
}

/**
 * Clave hasheada (SHA-256) para no persistir PII en memoria. El token de reset
 * se_hashea dentro de la clave: nunca se almacena en claro.
 */
function buildIdentifierKey(action: RateLimitAction, identifier: string): string {
  const normalized = normalizeRateLimitIdentifier(identifier);
  return createHash("sha256").update(`${action}|${normalized}`).digest("hex");
}

function buildIpKey(action: RateLimitAction, ip: string): string {
  return createHash("sha256").update(`${action}|ip|${ip}`).digest("hex");
}

interface ActionLimiters {
  identifier: RateLimiter;
  ip: RateLimiter;
}

const actionLimiters: Record<RateLimitAction, ActionLimiters> = {
  login: {
    identifier: createRateLimiter({
      limit: RATE_LIMITS.login.identifier,
      windowMs: RATE_LIMITS.login.windowMs,
    }),
    ip: createRateLimiter({
      limit: RATE_LIMITS.login.ip,
      windowMs: RATE_LIMITS.login.windowMs,
    }),
  },
  register: {
    identifier: createRateLimiter({
      limit: RATE_LIMITS.register.identifier,
      windowMs: RATE_LIMITS.register.windowMs,
    }),
    ip: createRateLimiter({
      limit: RATE_LIMITS.register.ip,
      windowMs: RATE_LIMITS.register.windowMs,
    }),
  },
  "request-reset": {
    identifier: createRateLimiter({
      limit: RATE_LIMITS["request-reset"].identifier,
      windowMs: RATE_LIMITS["request-reset"].windowMs,
    }),
    ip: createRateLimiter({
      limit: RATE_LIMITS["request-reset"].ip,
      windowMs: RATE_LIMITS["request-reset"].windowMs,
    }),
  },
  "reset-password": {
    identifier: createRateLimiter({
      limit: RATE_LIMITS["reset-password"].identifier,
      windowMs: RATE_LIMITS["reset-password"].windowMs,
    }),
    ip: createRateLimiter({
      limit: RATE_LIMITS["reset-password"].ip,
      windowMs: RATE_LIMITS["reset-password"].windowMs,
    }),
  },
};

/**
 * El limitador se activa solo en producción. En las suites de prueba el estado
 * es de proceso y efímero; activarlo en test puede producir 429 accidentales
 * y flakeo. La suite E2E corre contra `next start` (NODE_ENV=production) y usa
 * emails únicos por corrida y un número de peticiones muy por debajo de los
 * umbrales (2 registros desde la misma IP; 10 permitidos), por lo que no se
 * ve afectada. Ver el reporte de Onda B para el análisis completo.
 */
export function isRateLimitingEnabled(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Frontera de confianza de la señal de cliente: `x-forwarded-for`/`x-real-ip`
 * son CABECERAS FALSIFICABLES sin un proxy de confianza. Por eso la IP es
 * solo una dimensión secundaria y la clave primaria es el email normalizado
 * (o el token de reset). Sin proxy de confianza, la IP puede rotarse y solo
 * protege el contador por email.
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim();
  return null;
}

export interface RateLimitDecision {
  limited: boolean;
  retryAfterSeconds: number;
}

/**
 * Consume el contador por identificador (primario) y por IP (secundario).
 * Ambos deben permitir. Si el email no existe, también cuenta y también
 * limita: el 429 no es oráculo de existencia (ADR-006).
 */
export function consumeRateLimit(
  action: RateLimitAction,
  identifier: string,
  ip: string | null,
): RateLimitDecision {
  const identifierResult = actionLimiters[action].identifier.consume(
    buildIdentifierKey(action, identifier),
  );
  if (!identifierResult.allowed) {
    return {
      limited: true,
      retryAfterSeconds: identifierResult.retryAfterSeconds,
    };
  }

  if (ip) {
    const ipResult = actionLimiters[action].ip.consume(buildIpKey(action, ip));
    if (!ipResult.allowed) {
      return { limited: true, retryAfterSeconds: ipResult.retryAfterSeconds };
    }
  }

  return { limited: false, retryAfterSeconds: 0 };
}

/** Reinicia los contadores de una acción para un identificador (login exitoso). */
export function resetRateLimit(
  action: RateLimitAction,
  identifier: string,
  request?: Request | null,
): void {
  actionLimiters[action].identifier.reset(buildIdentifierKey(action, identifier));
  const ip = request ? getClientIp(request) : null;
  if (ip) {
    actionLimiters[action].ip.reset(buildIpKey(action, ip));
  }
}

/** Respuesta 429 con el contrato ApiResponse y la cabecera Retry-After. */
export function rateLimitResponse(retryAfterSeconds: number): Response {
  const body: ApiResponse<never> = fail("RATE_LIMITED", RATE_LIMITED_MESSAGE);
  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(0, Math.ceil(retryAfterSeconds))),
    },
  });
}

/**
 * Envoltorio único de aplicación del limitador en las rutas de auth.
 * Devuelve la respuesta 429 (con Retry-After) si se supera el límite, o null
 * si la petición puede continuar. Se evalúa ANTES de tocar la base de datos.
 */
export function enforceRateLimit(
  request: Request,
  action: RateLimitAction,
  identifier: string,
): Response | null {
  if (!isRateLimitingEnabled()) return null;
  const ip = getClientIp(request);
  const decision = consumeRateLimit(action, identifier, ip);
  if (!decision.limited) return null;
  return rateLimitResponse(decision.retryAfterSeconds);
}
