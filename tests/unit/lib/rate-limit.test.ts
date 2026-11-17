// tests/unit/lib/rate-limit.test.ts
// Pruebas unitarias del limitador de intentos in-process (H-4, F05-T01 loop 2/3).
// Entorno node: lógica pura sin DOM.

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createRateLimiter,
  normalizeRateLimitIdentifier,
  isRateLimitingEnabled,
  enforceRateLimit,
  RATE_LIMITED_MESSAGE,
} from "../../../src/lib/rate-limit";

describe("rate-limit — createRateLimiter (ventana fija, TTL, cota)", () => {
  it("permite hasta el límite y luego bloquea con retryAfterSeconds consistente", () => {
    let t = 1_000_000;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });

    expect(limiter.consume("k")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.consume("k")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    const blocked = limiter.consume("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // Tras expirar la ventana, vuelve a permitir (TTL/expiración).
    t += 60_001;
    expect(limiter.consume("k")).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("respeta la cota de entradas sin lanzar (fail-open ante tope de memoria)", () => {
    let t = 1_000_000;
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => t, maxEntries: 2 });

    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("b").allowed).toBe(true);
    expect(limiter.size()).toBe(2);
    // Cota alcanzada: descarta clave nueva sin crash (fail-open).
    const overflow = limiter.consume("c");
    expect(overflow.allowed).toBe(true);
  });

  it("reset elimina el contador de la clave", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 1_000_000 });
    expect(limiter.consume("k").allowed).toBe(true);
    expect(limiter.consume("k").allowed).toBe(false);
    limiter.reset("k");
    expect(limiter.consume("k").allowed).toBe(true);
  });
});

describe("rate-limit — normalización y activación", () => {
  it("normaliza identificador con trim, minúsculas y NFKC", () => {
    expect(normalizeRateLimitIdentifier("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("enforceRateLimit no aplica fuera de producción (anti-flakeo E2E/tests)", async () => {
    const prev = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "test");
    const res = enforceRateLimit(new Request("http://localhost/api/auth/login", { method: "POST" }), "login", "a@b.com");
    expect(res).toBeNull();
    if (prev === undefined) {
      vi.unstubAllEnvs();
    } else {
      vi.stubEnv("NODE_ENV", prev);
    }
  });
});

describe("rate-limit — respuesta 429", () => {
  it("RATE_LIMITED_MESSAGE es genérico (no oráculo)", () => {
    expect(RATE_LIMITED_MESSAGE).not.toMatch(/email|usuario|existe/i);
  });
});