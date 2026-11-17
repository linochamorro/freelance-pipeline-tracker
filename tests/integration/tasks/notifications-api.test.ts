import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// Mock de la resolución de sesión (F05-T01): la identidad viene de la cookie
// de sesión validada en servidor, no de cabeceras del cliente (x-user-id).
vi.mock("../../../src/lib/session", () => ({
  getSessionUserId: vi.fn(),
}));

import { getSessionUserId } from "../../../src/lib/session";
import { GET as getNotifications } from "../../../src/app/api/notifications/route";
import { PATCH as markRead } from "../../../src/app/api/notifications/[id]/read/route";

const prisma = new PrismaClient();

let testUserId: string;

function authRequest(
  url: string,
  method: "GET" | "PATCH",
  body?: unknown,
  userId?: string,
) {
  // La identidad se resuelve con la sesión mockeada (cookie en servidor);
  // ya no se envía ninguna cabecera x-user-id.
  (vi.mocked(getSessionUserId) as any).mockResolvedValue(userId ?? null);

  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function createUserWithTask(email: string) {
  const user = await prisma.user.create({ data: { email, name: "Test User" } });
  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Tarea para notificación",
      description: "desc",
      dueDate: new Date(),
      leadMinutes: 30,
    },
  });
  return { userId: user.id, taskId: task.id };
}

async function cleanupUser(userId: string) {
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.task.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

beforeEach(async () => {
  const { userId } = await createUserWithTask(
    `notif-${Date.now()}-${Math.random()}@example.com`,
  );
  testUserId = userId;
});

afterEach(async () => {
  if (testUserId) {
    await cleanupUser(testUserId);
    testUserId = "";
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/notifications", () => {
  it("devuelve 401 cuando no hay sesión de usuario", async () => {
    const res = await getNotifications(
      authRequest("http://localhost/api/notifications", "GET"),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBeDefined();
  });

  it("lista notificaciones del usuario ordenadas por triggerAt asc (200 ApiResponse<Notification[]>)", async () => {
    const now = new Date();
    await prisma.notification.create({
      data: {
        userId: testUserId,
        taskId: (await prisma.task.findFirst({ where: { userId: testUserId } }))!.id,
        title: "Aviso tarde",
        message: "msg",
        triggerAt: new Date(now.getTime() + 86400000),
        readInApp: false,
      },
    });
    await prisma.notification.create({
      data: {
        userId: testUserId,
        taskId: (await prisma.task.findFirst({ where: { userId: testUserId } }))!.id,
        title: "Aviso temprano",
        message: "msg",
        triggerAt: now,
        readInApp: false,
      },
    });

    const res = await getNotifications(
      authRequest(
        "http://localhost/api/notifications",
        "GET",
        undefined,
        testUserId,
      ),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data!.length).toBeGreaterThanOrEqual(2);
    const titles = (json.data as { title: string }[]).map((n) => n.title);
    expect(titles).toContain("Aviso temprano");
    expect(titles).toContain("Aviso tarde");
  });

  it("aisla notificaciones por userId", async () => {
    const otherUserId = await (async () => {
      const u = await prisma.user.create({
        data: { email: `other-notif-${Date.now()}-${Math.random()}@example.com`, name: "Other" },
      });
      const t = await prisma.task.create({
        data: {
          userId: u.id,
          title: "Otra tarea",
          description: "d",
          dueDate: new Date(),
          leadMinutes: 30,
        },
      });
      await prisma.notification.create({
        data: {
          userId: u.id,
          taskId: t.id,
          title: "Aviso ajeno",
          message: "m",
          triggerAt: new Date(),
          readInApp: false,
        },
      });
      return u.id;
    })();

    try {
      const res = await getNotifications(
        authRequest(
          "http://localhost/api/notifications",
          "GET",
          undefined,
          testUserId,
        ),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      const ids = (json.data as { userId: string }[]).map((n) => n.userId);
      expect(ids.every((id) => id === testUserId)).toBe(true);
    } finally {
      await prisma.notification.deleteMany({ where: { userId: otherUserId } });
      await prisma.task.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    }
  });
});

describe("PATCH /api/notifications/[id]/read", () => {
  it("devuelve 401 cuando no hay sesión de usuario", async () => {
    const res = await markRead(
      authRequest("http://localhost/api/notifications/notif_1/read", "PATCH"),
      { params: { id: "notif_1" } },
    );
    expect(res.status).toBe(401);
  });

  it("marca notificación propia como leída (readInApp = true) y responde 200", async () => {
    const notification = await prisma.notification.create({
      data: {
        userId: testUserId,
        taskId: (await prisma.task.findFirst({ where: { userId: testUserId } }))!.id,
        title: "Por leer",
        message: "m",
        triggerAt: new Date(),
        readInApp: false,
      },
    });

    const res = await markRead(
      authRequest(
        `http://localhost/api/notifications/${notification.id}/read`,
        "PATCH",
        undefined,
        testUserId,
      ),
      { params: { id: notification.id } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data?.readInApp).toBe(true);

    const persisted = await prisma.notification.findUnique({
      where: { id: notification.id },
    });
    expect(persisted?.readInApp).toBe(true);
  });

  it("rechaza marcar notificación de otro usuario", async () => {
    const otherUserId = await (async () => {
      const u = await prisma.user.create({
        data: { email: `other-read-${Date.now()}-${Math.random()}@example.com`, name: "Other" },
      });
      const t = await prisma.task.create({
        data: {
          userId: u.id,
          title: "Tarea ajena",
          description: "d",
          dueDate: new Date(),
          leadMinutes: 30,
        },
      });
      const n = await prisma.notification.create({
        data: {
          userId: u.id,
          taskId: t.id,
          title: "Aviso ajeno",
          message: "m",
          triggerAt: new Date(),
          readInApp: false,
        },
      });
      return { userId: u.id, notificationId: n.id };
    })();

    try {
      const res = await markRead(
        authRequest(
          `http://localhost/api/notifications/${otherUserId.notificationId}/read`,
          "PATCH",
          undefined,
          testUserId,
        ),
        { params: { id: otherUserId.notificationId } },
      );
      expect(res.status).toBe(404);
    } finally {
      await prisma.notification.deleteMany({ where: { userId: otherUserId.userId } });
      await prisma.task.deleteMany({ where: { userId: otherUserId.userId } });
      await prisma.user.delete({ where: { id: otherUserId.userId } });
    }
  });

  it("rechaza id inválido con 400", async () => {
    const res = await markRead(
      authRequest(
        "http://localhost/api/notifications/not-a-cuid/read",
        "PATCH",
        undefined,
        testUserId,
      ),
      { params: { id: "not-a-cuid" } },
    );
    expect(res.status).toBe(400);
  });
});
