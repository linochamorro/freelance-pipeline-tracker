// @vitest-environment node
// tests/e2e/full-journey.e2e.test.ts
// F05-T02 — Suite E2E HTTP contra el servidor de PRODUCCIÓN de Next
// (`next start`, build real) con `fetch` nativo de Node y cookies de sesión
// reales (sessionToken, HttpOnly) reenviadas manualmente.
//
// Recorrido: Registro → guard → deal → transiciones canTransition → nota
// append-only → tarea/aviso (ADR-005) → métricas Dashboard (ADR-003) →
// Settings → logout → negativos (401 / IDOR 404 / 405).
//
// Aislamiento de datos: usuario ÚNICO por corrida (email con sufijo único);
// el teardown (afterAll) borra EXCLUSIVAMENTE los usuarios propios de la
// corrida y sus datos por cascada (onDelete: Cascade verificado en
// prisma/schema.prisma). Jamás borra o modifica datos ajenos, sin truncate.
//
// Gate G-3: esta suite nunca imprime valores de .env/.env.local (el servidor
// los lee por sí solo); las credenciales usadas son ficticias y de prueba.

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  extractSessionCookie,
  extractSessionCookiePair,
  createApiClient,
  jsonOf,
  type ApiClient,
  type ApiEnvelope,
} from "./helpers/http";
import {
  startProductionServer,
  type ProdServerHandle,
} from "./helpers/server";

// Timeouts generosos definidos por archivo (sin modificar vitest.config.ts):
// hooks largos por el ciclo de servidor; tests de red con margen amplio.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 120_000 });

// ---------------------------------------------------------------------------
// Datos de la corrida (ficticios; el email garantiza unicidad por ejecución)
// ---------------------------------------------------------------------------

const E2E_PASSWORD = "E2e-Passw0rd!2026"; // contraseña fuerte FICTICIA de prueba
const RUN_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const EMAIL_A = `e2e-${RUN_ID}@example.test`;
const EMAIL_B = `e2e-b-${RUN_ID}@example.test`;

/** Deal principal: recorre el pipeline completo hasta InProgress. */
const DEAL_1 = {
  clientName: "Acme Corp E2E",
  description: "Portal web corporativo con integración a CRM",
  estimatedBudget: 1200.5,
  contactPersonName: "Lucía Ferrer",
  contactChannel: "Referral", // uno de los 7 canales canónicos (ADR-004)
};

/** Deal secundario: objetivo del salto inválido y del intento de subestado. */
const DEAL_2 = {
  clientName: "Globex E2E",
  description: "Automatización de reportes mensuales de ventas",
  estimatedBudget: 800,
  contactPersonName: "Marcos Díaz",
  contactChannel: "LinkedIn",
};

/** Cadena válida según canTransition desde Lead hasta InProgress. */
const VALID_CHAIN = [
  "Contacted",
  "MeetingScheduled",
  "BriefReceived",
  "ProposalSent",
  "Negotiation",
  "Accepted",
  "InProgress",
] as const;

// ---------------------------------------------------------------------------
// Estado compartido entre los pasos secuenciales del recorrido
// ---------------------------------------------------------------------------

interface RunState {
  server: ProdServerHandle | null;
  userA: ApiClient | null;
  userB: ApiClient | null;
  deal1Id: string | null;
  deal2Id: string | null;
  noteId: string | null;
  taskId: string | null;
  notificationId: string | null;
  settingsId: string | null;
}

const state: RunState = {
  server: null,
  userA: null,
  userB: null,
  deal1Id: null,
  deal2Id: null,
  noteId: null,
  taskId: null,
  notificationId: null,
  settingsId: null,
};

function server(): ProdServerHandle {
  if (!state.server) throw new Error("El servidor E2E no está disponible");
  return state.server;
}

function apiA(): ApiClient {
  if (!state.userA) throw new Error("La sesión del usuario A no está disponible");
  return state.userA;
}

function must(id: string | null, what: string): string {
  if (!id) throw new Error(`${what} no está disponible (paso previo fallido)`);
  return id;
}

// ---------------------------------------------------------------------------
// Ciclo de servidor y teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Si falta .next/BUILD_ID ejecuta `npm run build` UNA vez; luego `next start`
  // con stdio "ignore" (la sandbox bloquea los pipes nombrados) y readiness
  // con polling cada 500 ms hasta 120 s.
  state.server = await startProductionServer();
}, 120_000);

afterAll(async () => {
  // 1) Detener el árbol del servidor (Windows: taskkill /PID <pid> /T /F).
  state.server?.stop();
  state.server = null;

  // 2) Teardown de SOLO los datos propios de esta corrida: el borrado del
  //    usuario dispara onDelete: Cascade en Session, Opportunity, Task,
  //    Notification, UserSettings, Note, StageChange y SubStateChange
  //    (verificado en prisma/schema.prisma). Sin usuario previo → no-op.
  const prisma = new PrismaClient();
  try {
    for (const email of [EMAIL_A, EMAIL_B]) {
      try {
        await prisma.user.delete({ where: { email } });
      } catch {
        // El registro pudo fallar y no existir usuario: teardown no-op.
      }
    }
    const remaining = await prisma.user.count({
      where: { email: { in: [EMAIL_A, EMAIL_B] } },
    });
    expect(remaining).toBe(0);
  } finally {
    await prisma.$disconnect();
  }
}, 120_000);

// ---------------------------------------------------------------------------
// Recorrido E2E completo
// ---------------------------------------------------------------------------

describe("Recorrido E2E HTTP — servidor de producción Next (F05-T02)", () => {
  it(
    "1 · POST /api/auth/register → 201 ApiResponse con datos públicos sin passwordHash y cookie sessionToken HttpOnly",
    { timeout: 30_000 },
    async () => {
      const api = createApiClient(server().baseUrl);
      state.userA = api;

      const res = await api.request("POST", "/api/auth/register", {
        name: "E2E Runner",
        email: EMAIL_A,
        password: E2E_PASSWORD,
      });
      expect(res.status).toBe(201);

      const body = await jsonOf(res);
      expect(body.success).toBe(true);
      const user = body.data as { id: string; name: string; email: string };
      expect(user.email).toBe(EMAIL_A);
      expect(user.name).toBe("E2E Runner");
      expect(typeof user.id).toBe("string");
      // Nunca datos sensibles en el cuerpo
      expect(JSON.stringify(body)).not.toContain("passwordHash");
      expect(JSON.stringify(body)).not.toContain("sessionToken");

      // Cookie real de sesión: presente, HttpOnly, SameSite=Lax, Path=/
      const cookieHeader = extractSessionCookie(res);
      const cookiePair = extractSessionCookiePair(res);
      // La sesión se adjunta ANTES de asertar los flags (evita cascada)
      api.setCookie(cookiePair);
      expect(cookieHeader).not.toBeNull();
      expect(cookieHeader!).toMatch(/^sessionToken=/);
      const lower = cookieHeader!.toLowerCase();
      expect(lower).toContain("httponly");
      expect(lower).toContain("samesite=lax");
      expect(lower).toContain("path=/");
      expect(lower).toContain("max-age=2592000");
    },
  );

  it(
    "2 · Guard server-side: GET / con sesión → 200; GET / sin cookie → 307 redirect a /login",
    { timeout: 30_000 },
    async () => {
      const base = server().baseUrl;

      const withSession = await fetch(`${base}/`, {
        redirect: "manual",
        headers: { Cookie: apiA().cookie ?? "" },
      });
      expect(withSession.status).toBe(200);
      if (withSession.body) void withSession.body.cancel().catch(() => undefined);

      const withoutSession = await fetch(`${base}/`, { redirect: "manual" });
      expect(withoutSession.status).toBe(307);
      if (withoutSession.body) void withoutSession.body.cancel().catch(() => undefined);
    },
  );

  it(
    "3 · POST /api/opportunities → 201 ApiResponse y el deal nace en etapa Lead",
    { timeout: 30_000 },
    async () => {
      const res = await apiA().request("POST", "/api/opportunities", DEAL_1);
      expect(res.status).toBe(201);

      const body = await jsonOf(res);
      expect(body.success).toBe(true);
      const opp = body.data as {
        id: string;
        clientName: string;
        estimatedBudget: number;
        contactChannel: string;
        pipelineStage: string;
      };
      expect(opp.clientName).toBe(DEAL_1.clientName);
      expect(opp.estimatedBudget).toBe(DEAL_1.estimatedBudget);
      expect(opp.contactChannel).toBe(DEAL_1.contactChannel);
      expect(opp.pipelineStage).toBe("Lead");
      state.deal1Id = opp.id;
    },
  );

  it(
    "4 · GET /api/opportunities?isArchived=false → 200 y el listado contiene el deal creado",
    { timeout: 30_000 },
    async () => {
      const res = await apiA().request("GET", "/api/opportunities?isArchived=false");
      expect(res.status).toBe(200);

      const body = await jsonOf(res);
      expect(body.success).toBe(true);
      const list = body.data as Array<{ id: string; isArchived: boolean }>;
      expect(Array.isArray(list)).toBe(true);
      expect(list.some((o) => o.id === must(state.deal1Id, "deal principal"))).toBe(true);
    },
  );

  it(
    "5 · PATCH /api/opportunities/[id]: cadena canTransition Lead→…→InProgress con 200, etapa persistida y paymentStatus activado solo en ProposalSent",
    { timeout: 30_000 },
    async () => {
      const api = apiA();
      const id = must(state.deal1Id, "deal principal");

      for (const next of VALID_CHAIN) {
        // El subestado de pago se activa exactamente en ProposalSent
        // (PAYMENT_ACTIVATION_STAGE, regla congelada F01-T05).
        const payload =
          next === "ProposalSent"
            ? { pipelineStage: next, paymentStatus: "Pending" }
            : { pipelineStage: next };

        const res = await api.request("PATCH", `/api/opportunities/${id}`, payload);
        expect(res.status).toBe(200);

        const body = await jsonOf(res);
        expect(body.success).toBe(true);
        const updated = body.data as { pipelineStage: string; paymentStatus: string | null };
        expect(updated.pipelineStage).toBe(next);

        // Persistencia real: relectura por GET tras cada paso
        const verify = await api.request("GET", `/api/opportunities/${id}`);
        expect(verify.status).toBe(200);
        const persisted = ((await jsonOf(verify)).data as {
          pipelineStage: string;
          paymentStatus: string | null;
        });
        expect(persisted.pipelineStage).toBe(next);
        if (next === "ProposalSent") {
          expect(persisted.paymentStatus).toBe("Pending");
        }
      }

      // El subestado sobrevive a las transiciones posteriores (SubStateChange
      // se registra en servidor; el valor persiste en la entidad).
      const final = await apiA().request("GET", `/api/opportunities/${id}`);
      const finalData = (await jsonOf(final)).data as { pipelineStage: string; paymentStatus: string | null };
      expect(finalData.pipelineStage).toBe("InProgress");
      expect(finalData.paymentStatus).toBe("Pending");
    },
  );

  it(
    "6 · Rechazos de negocio: salto inválido Lead→Completed → 400 error controlado; paymentStatus fuera de ProposalSent → 400; el deal no muta",
    { timeout: 30_000 },
    async () => {
      const api = apiA();

      const created = await api.request("POST", "/api/opportunities", DEAL_2);
      expect(created.status).toBe(201);
      const createdBody = await jsonOf(created);
      expect(createdBody.success).toBe(true);
      state.deal2Id = (createdBody.data as { id: string }).id;
      const deal2 = must(state.deal2Id, "deal secundario");

      // Salto inválido: Lead → Completed (no está en getValidTransitions)
      const jump = await api.request("PATCH", `/api/opportunities/${deal2}`, {
        pipelineStage: "Completed",
      });
      expect(jump.status).toBe(400);
      const jumpBody: ApiEnvelope = await jsonOf(jump);
      expect(jumpBody.success).toBe(false);
      expect(jumpBody.error?.code).toBe("VALIDATION_ERROR");
      expect(typeof jumpBody.error?.message).toBe("string");

      // Subestado de pago fuera de ProposalSent → rechazado por la regla congelada
      const badSub = await api.request("PATCH", `/api/opportunities/${deal2}`, {
        paymentStatus: "Pending",
      });
      expect(badSub.status).toBe(400);
      expect((await jsonOf(badSub)).error?.code).toBe("VALIDATION_ERROR");

      // Persistencia: el deal sigue intacto en Lead y sin paymentStatus
      const reread = await api.request("GET", `/api/opportunities/${deal2}`);
      expect(reread.status).toBe(200);
      const persisted = (await jsonOf(reread)).data as {
        pipelineStage: string;
        paymentStatus: string | null;
      };
      expect(persisted.pipelineStage).toBe("Lead");
      expect(persisted.paymentStatus).toBeNull();
    },
  );

  it(
    "7 · Notas append-only: POST /api/notes → 201; GET por opportunityId la lista; PATCH /api/notes/[id] → 405 (ADR-002)",
    { timeout: 30_000 },
    async () => {
      const api = apiA();
      const deal1 = must(state.deal1Id, "deal principal");

      const created = await api.request("POST", "/api/notes", {
        opportunityId: deal1,
        content: "Primera llamada agendada; el cliente pidió propuesta con soporte.",
      });
      expect(created.status).toBe(201);
      const createdBody = await jsonOf(created);
      expect(createdBody.success).toBe(true);
      state.noteId = (createdBody.data as { id: string }).id;

      const list = await api.request("GET", `/api/notes?opportunityId=${deal1}`);
      expect(list.status).toBe(200);
      const notes = (await jsonOf(list)).data as Array<{ id: string; content: string }>;
      expect(notes.some((n) => n.id === must(state.noteId, "nota"))).toBe(true);

      // Inmutabilidad: la mutación se rechaza con 405 Method Not Allowed
      const patched = await api.request("PATCH", `/api/notes/${must(state.noteId, "nota")}`, {
        content: "intento de edición prohibido",
      });
      expect(patched.status).toBe(405);
      const patchedBody = await jsonOf(patched);
      expect(patchedBody.success).toBe(false);
      expect(patchedBody.error?.code).toBe("METHOD_NOT_ALLOWED");
    },
  );

  it(
    "8 · POST /api/tasks (dueDate futura, leadMinutes ∈ conjunto cerrado ADR-005) → 201; aviso en GET /api/notifications con triggerAt = dueDate - adelanto; PATCH read → readInApp true persistido",
    { timeout: 30_000 },
    async () => {
      const api = apiA();
      const LEAD_MINUTES = 60;
      const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const res = await api.request("POST", "/api/tasks", {
        title: "Preparar propuesta Acme",
        description: "Borrador con alcance, precio y condiciones",
        dueDate: dueDate.toISOString(),
        leadMinutes: LEAD_MINUTES,
        opportunityId: must(state.deal1Id, "deal principal"),
      });
      expect(res.status).toBe(201);

      const body = await jsonOf(res);
      expect(body.success).toBe(true);
      const task = body.data as {
        id: string;
        title: string;
        leadMinutes: number;
        completed: boolean;
        opportunityId: string | null;
      };
      expect(task.title).toBe("Preparar propuesta Acme");
      expect(task.leadMinutes).toBe(LEAD_MINUTES);
      expect(task.completed).toBe(false);
      expect(task.opportunityId).toBe(must(state.deal1Id, "deal principal"));
      state.taskId = task.id;

      // El trigger calculado (dueDate - leadMinutes) vive en la notificación
      const expectedTrigger = dueDate.getTime() - LEAD_MINUTES * 60_000;
      const notifList = await api.request("GET", "/api/notifications");
      expect(notifList.status).toBe(200);
      const notifications = (await jsonOf(notifList)).data as Array<{
        id: string;
        taskId: string;
        triggerAt: string;
        readInApp: boolean;
      }>;
      const mine = notifications.find((n) => n.taskId === task.id);
      expect(mine).toBeDefined();
      expect(new Date(mine!.triggerAt).getTime()).toBe(expectedTrigger);
      expect(mine!.readInApp).toBe(false);
      state.notificationId = mine!.id;

      // Marcar como leída en la campana
      const read = await api.request("PATCH", `/api/notifications/${mine!.id}/read`);
      expect(read.status).toBe(200);
      expect(((await jsonOf(read)).data as { readInApp: boolean }).readInApp).toBe(true);

      // Persistencia real del flag de lectura
      const reread = await api.request("GET", "/api/notifications");
      const rereadList = (await jsonOf(reread)).data as Array<{ id: string; readInApp: boolean }>;
      expect(rereadList.find((n) => n.id === mine!.id)?.readInApp).toBe(true);
    },
  );

  it(
    "9 · GET /api/dashboard → métricas coherentes con los deals creados (pipelineValue exacto, activeDeals, sin stale con umbrales 7d)",
    { timeout: 30_000 },
    async () => {
      const res = await apiA().request("GET", "/api/dashboard");
      expect(res.status).toBe(200);

      const body = await jsonOf(res);
      expect(body.success).toBe(true);
      const metrics = body.data as {
        pipelineValue: number;
        conversionRate: number;
        activeDeals: number;
        staleDeals: Array<{ id: string; daysOverdue: number }>;
      };

      // Valor del pipeline: suma exacta de los presupuestos del usuario (no archivados)
      expect(metrics.pipelineValue).toBe(DEAL_1.estimatedBudget + DEAL_2.estimatedBudget);
      expect(metrics.pipelineValue).toBeGreaterThanOrEqual(DEAL_1.estimatedBudget);

      // Deals activos: ambos deals son no terminales (InProgress + Lead)
      expect(metrics.activeDeals).toBe(2);
      expect(typeof metrics.conversionRate).toBe("number");

      // Staleness según umbrales (ADR-003): deals recién creados/actualizados
      // con umbrales por defecto (7 días) NO pueden aparecer como inactivos.
      expect(Array.isArray(metrics.staleDeals)).toBe(true);
      const ourIds = [state.deal1Id, state.deal2Id];
      expect(metrics.staleDeals.some((d) => ourIds.includes(d.id))).toBe(false);
    },
  );

  it(
    "10 · Settings: GET inicial (defaults ADR-003) → PUT con id y umbrales → GET devuelve EXACTAMENTE los valores guardados",
    { timeout: 30_000 },
    async () => {
      const api = apiA();

      const initial = await api.request("GET", "/api/settings");
      expect(initial.status).toBe(200);
      const initialSettings = ((await jsonOf(initial)).data ?? null) as {
        id: string;
        prospectionStalenessDays: number;
        proposalStalenessDays: number;
        executionStalenessDays: number;
        billingStalenessDays: number;
        closedStalenessDays: number;
        notificationEnabled: boolean;
      } | null;
      expect(initialSettings).not.toBeNull();
      state.settingsId = initialSettings!.id;
      expect(initialSettings!.prospectionStalenessDays).toBe(7);

      // La UI de ajustes envía los umbrales + notificationEnabled y el id de
      // UserSettings requerido por el contrato.
      // `currency` no forma parte de UserSettings: la API descarta el campo y
      // el GET no lo devuelve.
      const payload = {
        id: initialSettings!.id,
        prospectionStalenessDays: 3,
        proposalStalenessDays: 5,
        notificationEnabled: false,
        currency: "EUR",
      };
      const put = await api.request("PUT", "/api/settings", payload);
      expect(put.status).toBe(200);
      const saved = (await jsonOf(put)).data as typeof initialSettings;
      expect(saved?.prospectionStalenessDays).toBe(3);
      expect(saved?.proposalStalenessDays).toBe(5);
      expect(saved?.notificationEnabled).toBe(false);

      // Persistencia real: relectura con EXACTAMENTE los valores guardados
      const reread = await api.request("GET", "/api/settings");
      expect(reread.status).toBe(200);
      const rereadSettings = (await jsonOf(reread)).data as typeof initialSettings;
      expect(rereadSettings?.prospectionStalenessDays).toBe(3);
      expect(rereadSettings?.proposalStalenessDays).toBe(5);
      expect(rereadSettings?.notificationEnabled).toBe(false);
      expect(rereadSettings?.executionStalenessDays).toBe(initialSettings!.executionStalenessDays);
      expect(rereadSettings?.billingStalenessDays).toBe(initialSettings!.billingStalenessDays);
      expect(rereadSettings?.closedStalenessDays).toBe(initialSettings!.closedStalenessDays);
      // La preferencia de moneda no forma parte de los ajustes persistidos.
      expect((rereadSettings as unknown as Record<string, unknown>).currency).toBeUndefined();
    },
  );

  it(
    "11 · POST /api/auth/logout → 200 ok(null) con cookie expirada; la sesión queda invalidada en servidor (401 con la misma cookie)",
    { timeout: 30_000 },
    async () => {
      const api = apiA();
      const res = await api.request("POST", "/api/auth/logout");
      expect(res.status).toBe(200);

      const body = await jsonOf(res);
      expect(body.success).toBe(true);
      expect(body.data).toBeNull();

      const cookie = extractSessionCookie(res);
      expect(cookie).not.toBeNull();
      expect(cookie!.toLowerCase()).toContain("max-age=0");

      // La cookie sigue siendo la misma, pero la sesión fue borrada: 401
      const after = await api.request("GET", "/api/opportunities");
      expect(after.status).toBe(401);
      const afterBody = await jsonOf(after);
      expect(afterBody.success).toBe(false);
      expect(afterBody.error?.code).toBe("UNAUTHORIZED");
    },
  );

  it(
    "12 · Negativos: GET /api/opportunities sin cookie → 401; IDOR con segundo usuario real → GET /api/opportunities/[id] ajeno → 404",
    { timeout: 30_000 },
    async () => {
      const base = server().baseUrl;
      const deal1 = must(state.deal1Id, "deal del usuario A");

      // Sin cookie de sesión
      const anon = await fetch(`${base}/api/opportunities`, { redirect: "manual" });
      expect(anon.status).toBe(401);
      const anonBody = (await anon.json()) as { success: boolean; error?: { code: string } };
      expect(anonBody.success).toBe(false);
      expect(anonBody.error?.code).toBe("UNAUTHORIZED");

      // Segundo usuario REAL (email propio único; teardown propio en afterAll)
      const apiB = createApiClient(base);
      state.userB = apiB;
      const reg = await apiB.request("POST", "/api/auth/register", {
        name: "E2E Runner B",
        email: EMAIL_B,
        password: E2E_PASSWORD,
      });
      expect(reg.status).toBe(201);
      apiB.setCookie(extractSessionCookiePair(reg));

      // IDOR: leer el deal del primer usuario → 404 (no 200, no 403 con datos)
      const foreign = await apiB.request("GET", `/api/opportunities/${deal1}`);
      expect(foreign.status).toBe(404);
      const foreignBody = await jsonOf(foreign);
      expect(foreignBody.success).toBe(false);
      expect(foreignBody.error?.code).toBe("NOT_FOUND");

      // El aislamiento también aplica a notas y al listado de B
      const foreignNotes = await apiB.request("GET", `/api/notes?opportunityId=${deal1}`);
      expect(foreignNotes.status).toBe(404);

      const listB = await apiB.request("GET", "/api/opportunities?isArchived=false");
      expect(listB.status).toBe(200);
      const listBData = ((await jsonOf(listB)).data ?? []) as Array<{ id: string }>;
      expect(listBData.some((o) => o.id === deal1)).toBe(false);
    },
  );
});
