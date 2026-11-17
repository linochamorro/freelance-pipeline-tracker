// tests/e2e/helpers/server.ts
// F05-T02 — Infraestructura de la suite E2E: ciclo de vida del servidor de
// PRODUCCIÓN de Next (`next start`) en un puerto local.
//
// - Si falta `.next/BUILD_ID` ejecuta `npm run build` UNA vez (spawn síncrono).
// - Levanta `next start` con stdio: "ignore" (los pipes nombrados están
//   bloqueados por la sandbox de Windows y provocan EPERM; "inherit" también vale).
// - Espera readiness con polling HTTP cada 500 ms (máximo 120 s).
// - En Windows detiene el árbol de procesos con `taskkill /PID <pid> /T /F`.
//
// Gate G-3: aquí NO se imprime ni se lee ningún valor de .env/.env.local
// (DATABASE_URL, AUTH_SECRET, etc.). El servidor los carga por sí mismo.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Raíz del proyecto (tests/e2e/helpers/server.ts → 4 niveles arriba). */
const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");

/** Binario CLI de Next instalado localmente (sin dependencias nuevas). */
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

/** Puerto por defecto de la suite E2E (sobre-escribible con env E2E_PORT). */
export const E2E_DEFAULT_PORT = 3457;

/** Readiness: máximo de espera del polling (ms). */
const READINESS_TIMEOUT_MS = 120_000;

/** Intervalo entre intentos de readiness (ms). */
const READINESS_POLL_MS = 500;

/** Límite de seguridad para el build síncrono cuando falta BUILD_ID (ms). */
const BUILD_TIMEOUT_MS = 10 * 60_000;

export function resolveE2EPort(): number {
  const raw = process.env.E2E_PORT;
  const parsed = raw !== undefined && raw !== "" ? Number(raw) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : E2E_DEFAULT_PORT;
}

/**
 * Garantiza que exista un build de producción. Solo ejecuta `npm run build`
 * cuando falta `.next/BUILD_ID` (nunca reconstruye si ya existe: el orden
 * canónico `npm run build` → `npx vitest run` garantiza frescura).
 */
export function ensureProductionBuild(): void {
  const buildIdPath = path.join(ROOT, ".next", "BUILD_ID");
  if (existsSync(buildIdPath)) return;

  const result = spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    stdio: "ignore",
    shell: true,
    timeout: BUILD_TIMEOUT_MS,
    windowsHide: true,
  });

  if (result.status !== 0 || !existsSync(buildIdPath)) {
    throw new Error(
      `E2E: 'npm run build' falló (status=${String(result.status)}) preparando el servidor de producción.`,
    );
  }
}

/**
 * Espera a que el servidor responda a cualquier petición HTTP (cualquier
 * status —incluido 307 del guard— implica que está sirviendo).
 */
async function waitUntilReady(baseUrl: string): Promise<void> {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_500),
      });
      if (res.body) {
        void res.body.cancel().catch(() => undefined);
      }
      return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, READINESS_POLL_MS));
  }

  throw new Error(
    `E2E: el servidor no respondió en ${READINESS_TIMEOUT_MS} ms (${baseUrl}). Último error: ${String(lastError)}`,
  );
}

/** Detiene el árbol de procesos del servidor (Windows: taskkill /T /F). */
function killProcessTree(child: ChildProcess): void {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

export interface ProdServerHandle {
  baseUrl: string;
  port: number;
  /** Detiene el servidor y su árbol de procesos. Idempotente. */
  stop(): void;
}

/**
 * Levanta `next start` (build de producción) sobre `port` y espera readiness.
 * Equivalente CLI: `node ./node_modules/next/dist/bin/next start -p <puerto>`.
 */
export async function startProductionServer(
  port: number = resolveE2EPort(),
): Promise<ProdServerHandle> {
  ensureProductionBuild();

  const child = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(port)], {
    cwd: ROOT,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env },
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  let stopped = false;

  try {
    await waitUntilReady(baseUrl);
  } catch (err) {
    killProcessTree(child);
    throw err;
  }

  return {
    baseUrl,
    port,
    stop(): void {
      if (stopped) return;
      stopped = true;
      killProcessTree(child);
    },
  };
}
