import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// Mock de la resolución de sesión (F05-T01): la identidad viene de la cookie
// de sesión validada en servidor, no de cabeceras del cliente (x-user-id).
vi.mock("../../../src/lib/session", () => ({
  getSessionUserId: vi.fn(),
}));

import { getSessionUserId } from "../../../src/lib/session";
import { GET as getTasks, POST as createTaskRoute } from "../../../src/app/api/tasks/route";
import { PATCH as patchTask, DELETE as deleteTask } from "../../../src/app/api/tasks/[id]/route";

const prisma = new PrismaClient();

let testUserId: string;

function authRequest(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
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

async function createUser(email: string) {
  const user = await prisma.user.create({ data: { email, name: "Test User" } });
  return user.id;
}

async function cleanupUser(userId: string) {
  await prisma.notification.deleteMany({ where: { task: { userId } } });
  await prisma.task.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

beforeEach(async () => {
  testUserId = await createUser(`tasks-${Date.now()}-${Math.random()}@example.com`);
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

describe("GET /api/tasks", () => {
  it("devuelve 401 cuando no hay sesión de usuario", async () => {
    const res = await getTasks(authRequest("http://localhost/api/tasks", "GET"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBeDefined();
  });

  it("lista tareas del usuario autenticado ordenadas por dueDate asc (200 ApiResponse<Task[]>)", async () => {
    const now = new Date();
    await prisma.task.create({
      data: {
        userId: testUserId,
        title: "Tarea tarde",
        description: "desc",
        dueDate: new Date(now.getTime() + 86400000),
        leadMinutes: 60,
      },
    });
    await prisma.task.create({
      data: {
        userId: testUserId,
        title: "Tarea temprana",
        description: "desc",
        dueDate: now,
        leadMinutes: 15,
      },
    });

    const res = await getTasks(authRequest("http://localhost/api/tasks", "GET", undefined, testUserId));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data!.length).toBe(2);
    expect((json.data as { title: string }[])[0].title).toBe("Tarea temprana");
    expect((json.data as { title: string }[])[1].title).toBe("Tarea tarde");
  });

  it("aisla tareas por userId (no devuelve tareas de otro usuario)", async () => {
    const otherUserId = await createUser(`other-${Date.now()}-${Math.random()}@example.com`);
    await prisma.task.create({
      data: {
        userId: otherUserId,
        title: "Tarea ajena",
        description: "desc",
        dueDate: new Date(),
        leadMinutes: 30,
      },
    });

    try {
      const res = await getTasks(
        authRequest("http://localhost/api/tasks", "GET", undefined, testUserId),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect((json.data as { length: number }).length).toBe(0);
    } finally {
      await prisma.notification.deleteMany({ where: { task: { userId: otherUserId } } });
      await prisma.task.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    }
  });
});

describe("POST /api/tasks", () => {
  it("devuelve 401 cuando no hay sesión de usuario", async () => {
    const res = await createTaskRoute(
      authRequest("http://localhost/api/tasks", "POST", {
        title: "x",
        description: "y",
        dueDate: new Date().toISOString(),
        leadMinutes: 30,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("crea tarea válida y responde 201 ApiResponse<Task> (201 Created)", async () => {
    const dueDate = new Date(Date.now() + 3600000).toISOString();
    const res = await createTaskRoute(
      authRequest("http://localhost/api/tasks", "POST", {
        title: "Revisar contrato",
        description: "Leer cláusulas de confidencialidad",
        dueDate,
        leadMinutes: 60,
      }, testUserId),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data?.title).toBe("Revisar contrato");
    expect(json.data?.userId).toBe(testUserId);
    expect(json.data?.leadMinutes).toBe(60);
    expect(json.data?.completed).toBe(false);
  });

  it("rechaza payload inválido con 400 y ApiResponse con error.code y error.message", async () => {
    const res = await createTaskRoute(
      authRequest("http://localhost/api/tasks", "POST", {
        title: "ab",
        description: "x",
        dueDate: "not-a-date",
        leadMinutes: 999,
      }, testUserId),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBeDefined();
    expect(json.error?.message).toBeDefined();
  });

  it("no crea tarea cuando validación falla (0 tareas en BD)", async () => {
    await createTaskRoute(
      authRequest("http://localhost/api/tasks", "POST", {
        title: "ab",
        description: "x",
        dueDate: "bad",
        leadMinutes: 999,
      }, testUserId),
    );
    const count = await prisma.task.count({ where: { userId: testUserId } });
    expect(count).toBe(0);
  });
});

describe("PATCH /api/tasks/[id]", () => {
  it("devuelve 401 cuando no hay sesión de usuario", async () => {
    const res = await patchTask(
      authRequest("http://localhost/api/tasks/task_1", "PATCH", { title: "x" }),
      { params: { id: "task_1" } },
    );
    expect(res.status).toBe(401);
  });

  it("actualiza título de tarea propia y responde 200 ApiResponse<Task>", async () => {
    const task = await prisma.task.create({
      data: {
        userId: testUserId,
        title: "Título original",
        description: "desc",
        dueDate: new Date(),
        leadMinutes: 30,
      },
    });

    const res = await patchTask(
      authRequest(
        `http://localhost/api/tasks/${task.id}`,
        "PATCH",
        { title: "Título actualizado" },
        testUserId,
      ),
      { params: { id: task.id } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data?.title).toBe("Título actualizado");
    expect(json.data?.id).toBe(task.id);
  });

  it("marca tarea como completada vía completed=true", async () => {
    const task = await prisma.task.create({
      data: {
        userId: testUserId,
        title: "Pendiente",
        description: "desc",
        dueDate: new Date(),
        leadMinutes: 30,
        completed: false,
      },
    });

    const res = await patchTask(
      authRequest(
        `http://localhost/api/tasks/${task.id}`,
        "PATCH",
        { completed: true },
        testUserId,
      ),
      { params: { id: task.id } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data?.completed).toBe(true);
  });

  it("rechaza actualizar tarea de otro usuario (pertenencia)", async () => {
    const otherUserId = await createUser(`other-patch-${Date.now()}-${Math.random()}@example.com`);
    const task = await prisma.task.create({
      data: {
        userId: otherUserId,
        title: "Ajena",
        description: "desc",
        dueDate: new Date(),
        leadMinutes: 30,
      },
    });

    try {
      const res = await patchTask(
        authRequest(
          `http://localhost/api/tasks/${task.id}`,
          "PATCH",
          { title: "Intento hackeo" },
          testUserId,
        ),
        { params: { id: task.id } },
      );
      expect(res.status).toBe(404);
    } finally {
      await prisma.notification.deleteMany({ where: { task: { userId: otherUserId } } });
      await prisma.task.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    }
  });

  it("rechaza id inválido con 400", async () => {
    const res = await patchTask(
      authRequest("http://localhost/api/tasks/not-a-cuid", "PATCH", { title: "x" }, testUserId),
      { params: { id: "not-a-cuid" } },
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/tasks/[id]", () => {
  it("devuelve 401 cuando no hay sesión de usuario", async () => {
    const res = await deleteTask(
      authRequest("http://localhost/api/tasks/task_1", "DELETE"),
      { params: { id: "task_1" } },
    );
    expect(res.status).toBe(401);
  });

  it("elimina tarea propia y responde 204 No Content", async () => {
    const task = await prisma.task.create({
      data: {
        userId: testUserId,
        title: "Para borrar",
        description: "desc",
        dueDate: new Date(),
        leadMinutes: 30,
      },
    });

    const res = await deleteTask(
      authRequest(`http://localhost/api/tasks/${task.id}`, "DELETE", undefined, testUserId),
      { params: { id: task.id } },
    );
    expect(res.status).toBe(204);

    const remaining = await prisma.task.findUnique({ where: { id: task.id } });
    expect(remaining).toBeNull();
  });

  it("rechaza eliminar tarea de otro usuario", async () => {
    const otherUserId = await createUser(`other-del-${Date.now()}-${Math.random()}@example.com`);
    const task = await prisma.task.create({
      data: {
        userId: otherUserId,
        title: "Ajena",
        description: "desc",
        dueDate: new Date(),
        leadMinutes: 30,
      },
    });

    try {
      const res = await deleteTask(
        authRequest(
          `http://localhost/api/tasks/${task.id}`,
          "DELETE",
          undefined,
          testUserId,
        ),
        { params: { id: task.id } },
      );
      expect(res.status).toBe(404);
    } finally {
      await prisma.notification.deleteMany({ where: { task: { userId: otherUserId } } });
      await prisma.task.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    }
  });

  it("rechaza id inválido con 400", async () => {
    const res = await deleteTask(
      authRequest("http://localhost/api/tasks/not-a-cuid", "DELETE", undefined, testUserId),
      { params: { id: "not-a-cuid" } },
    );
    expect(res.status).toBe(400);
  });
});
