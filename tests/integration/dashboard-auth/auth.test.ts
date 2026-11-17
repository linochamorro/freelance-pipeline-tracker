import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleRequestReset } from "../../../src/app/api/auth/request-reset/route";
import { handleResetPassword } from "../../../src/app/api/auth/reset-password/route";
import { InMemoryEmailAdapter } from "../../../src/lib/email-adapter";

// Mock del módulo email-adapter (no envía correos reales en tests)
vi.mock("../../../src/lib/email-adapter", () => ({
  EmailAdapter: class {},
  InMemoryEmailAdapter: class {
    public sent: Array<{ to: string; subject: string; html: string; text: string }> = [];
    async sendEmail(params: { to: string; subject: string; html: string; text: string }) {
      this.sent.push(params);
    }
  },
  ResendEmailAdapter: class {},
}));

// Prisma mock con soporte de $transaction para H-3 (reclamo atómico en una instancia).
const tx = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  session: { deleteMany: vi.fn() },
  verificationToken: { create: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("../../../src/services/auth-reset-service", () => ({
  prisma: {
    ...tx,
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  },
  requestPasswordReset: vi.fn(),
  consumePasswordResetToken: vi.fn(),
}));

vi.mock("../../../src/services/auth-service", () => ({
  prisma: {
    user: { update: vi.fn() },
  },
  updatePassword: vi.fn(),
}));

import * as authResetService from "../../../src/services/auth-reset-service";
import { requestPasswordReset, consumePasswordResetToken } from "../../../src/services/auth-reset-service";

const RESET_MESSAGE =
  "Si el correo está registrado, recibirás un enlace de restablecimiento";
const OK_MESSAGE =
  "Si el token era válido, la contraseña se ha actualizado correctamente";

let emailAdapter: InMemoryEmailAdapter;

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/request-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockRequestRaw(text: string): Request {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: text,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  emailAdapter = new InMemoryEmailAdapter();
});

describe("POST /api/auth/request-reset (ADR-006: no enumeración)", () => {
  it("responde 200 OK y genera token cuando el email existe", async () => {
    (requestPasswordReset as any).mockResolvedValue({
      message: RESET_MESSAGE,
      token: "abc123token",
    });

    const res = await handleRequestReset(
      mockRequest({ email: "user@example.com" }),
      emailAdapter,
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe(RESET_MESSAGE);
    expect(requestPasswordReset).toHaveBeenCalledWith("user@example.com");
  });

  it("responde 200 OK idéntico cuando el email NO existe (no enumeración)", async () => {
    (requestPasswordReset as any).mockResolvedValue({
      message: RESET_MESSAGE,
    });

    const res = await handleRequestReset(
      mockRequest({ email: "noexiste@example.com" }),
      emailAdapter,
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe(RESET_MESSAGE);
    expect(requestPasswordReset).toHaveBeenCalledWith("noexiste@example.com");
  });

  it("responde 200 OK para cuerpo no parseable (sin revelar, ADR-006)", async () => {
    const res = await handleRequestReset(mockRequestRaw("no-es-json"), emailAdapter);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe(RESET_MESSAGE);
  });

  it("responde 400 para email con formato inválido sin consultar existencia", async () => {
    const res = await handleRequestReset(
      mockRequest({ email: "no-es-un-email" }),
      emailAdapter,
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/reset-password (ADR-006: token de uso único, H-3)", () => {
  it("responde 200 OK y delega el consumo atómico cuando el cuerpo es válido", async () => {
    (consumePasswordResetToken as any).mockResolvedValue(undefined);

    const res = await handleResetPassword(
      mockRequestRaw(JSON.stringify({ token: "valido", password: "NuevaPass123" })),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe(OK_MESSAGE);
    expect(consumePasswordResetToken).toHaveBeenCalledWith("valido", "NuevaPass123");
  });

  it("responde 200 OK idéntico para token inválido/expirado/reusado (no muta, no 500)", async () => {
    (consumePasswordResetToken as any).mockResolvedValue(undefined);

    const res = await handleResetPassword(
      mockRequestRaw(JSON.stringify({ token: "inexistente", password: "NuevaPass123" })),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ message: OK_MESSAGE });
  });

  it("responde 400 INVALID_REQUEST cuando faltan token o contraseña (cuerpo inválido)", async () => {
    const res = await handleResetPassword(
      mockRequestRaw(JSON.stringify({ token: "", password: "NuevaPass123" })),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("INVALID_REQUEST");
    expect(consumePasswordResetToken).not.toHaveBeenCalled();
  });

  it("responde 400 INVALID_REQUEST para contraseña demasiado corta", async () => {
    const res = await handleResetPassword(
      mockRequestRaw(JSON.stringify({ token: "t", password: "corta" })),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("INVALID_REQUEST");
    expect(consumePasswordResetToken).not.toHaveBeenCalled();
  });
});
