import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { calculateNotificationTrigger } from "../../../src/lib/rules/task-schedule";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

const mTask = {
  create: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const mNotification = {
  create: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
};

let mTxFn: ReturnType<typeof vi.fn> | undefined;
vi.mocked(PrismaClient).mockImplementation(
  () =>
    ({
      task: mTask,
      notification: mNotification,
      $transaction: mTxFn,
    }) as unknown as PrismaClient,
);

mTxFn = vi.fn(async (cb: (tx: { task: typeof mTask; notification: typeof mNotification; $transaction: unknown }) => unknown) =>
  cb({ task: mTask, notification: mNotification, $transaction: mTxFn }),
);

const { createTask, listTasks, updateTask, markTaskCompleted, deleteTask } = await import(
  "../../../src/services/task-service"
);

import type { Task, TaskLeadMinutes, Notification } from "../../../src/types";

beforeEach(() => {
  vi.resetAllMocks();
  mTxFn!.mockImplementation(async (cb) =>
    cb({ task: mTask, notification: mNotification, $transaction: mTxFn! }),
  );
});

const baseInput = {
  userId: "user_1",
  title: "Enviar mockup",
  description: "Preparar archivos del cliente",
  dueDate: "2026-11-12T14:00:00Z",
  leadMinutes: 60 as TaskLeadMinutes,
};

const createdTask: Task = {
  id: "task_1",
  userId: "user_1",
  opportunityId: null,
  title: "Enviar mockup",
  description: "Preparar archivos del cliente",
  dueDate: new Date("2026-11-12T14:00:00Z"),
  completed: false,
  leadMinutes: 60,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function dueDateOf(task: Task): Date {
  return task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
}

describe("task-service — createTask", () => {
  it("crea tarea y notificación con trigger calculado", async () => {
    mTask.create.mockResolvedValue(createdTask);

    const result = await createTask(baseInput);

    expect(result.id).toBe("task_1");
    expect(mTask.create).toHaveBeenCalledTimes(1);
    const createCall = mTask.create.mock.calls[0][0];
    expect(createCall.data.userId).toBe("user_1");
    expect(createCall.data.title).toBe("Enviar mockup");
    expect(createCall.data.leadMinutes).toBe(60);
    expect(new Date(createCall.data.dueDate as Date).getTime()).toBe(
      new Date("2026-11-12T14:00:00Z").getTime(),
    );

    const expectedTrigger = calculateNotificationTrigger(
      new Date("2026-11-12T14:00:00Z"),
      60,
    );
    expect(mNotification.create).toHaveBeenCalledTimes(1);
    const notifCall = mNotification.create.mock.calls[0][0].data;
    expect(notifCall.taskId).toBe("task_1");
    expect(new Date(notifCall.triggerAt as Date).getTime()).toBe(expectedTrigger.getTime());
    expect(notifCall.sentEmail).toBe(false);
    expect(notifCall.readInApp).toBe(false);
  });

  it("rechaza leadMinutes fuera del conjunto cerrado", async () => {
    await expect(createTask({ ...baseInput, leadMinutes: 45 as TaskLeadMinutes })).rejects.toThrow(
      /leadMinutes inválido/,
    );
    expect(mTask.create).not.toHaveBeenCalled();
  });
});

describe("task-service — listTasks", () => {
  it("lista tareas aisladas por userId", async () => {
    mTask.findMany.mockResolvedValue([createdTask]);

    const result = await listTasks("user_1");

    expect(result).toHaveLength(1);
    expect(mTask.findMany).toHaveBeenCalledTimes(1);
    expect(mTask.findMany.mock.calls[0][0]).toMatchObject({ where: { userId: "user_1" } });
  });
});

describe("task-service — updateTask", () => {
  it("actualiza tarea y recalcula trigger de notificación", async () => {
    mTask.findUnique.mockResolvedValue(createdTask);
    mTask.update.mockResolvedValue({ ...createdTask, title: "Enviar mockup v2" });
    mNotification.findFirst.mockResolvedValue(
      { id: "notif_1", taskId: "task_1" } as Notification,
    );

    const result = await updateTask("task_1", "user_1", {
      title: "Enviar mockup v2",
      leadMinutes: 120 as TaskLeadMinutes,
    });

    expect(result.title).toBe("Enviar mockup v2");
    const updateCall = mTask.update.mock.calls[0][0];
    expect(updateCall.data.leadMinutes).toBe(120);
    expect(updateCall.data.dueDate).toBeUndefined();
    expect(mNotification.update).toHaveBeenCalledTimes(1);
    const notifUpdate = mNotification.update.mock.calls[0][0];
    expect(notifUpdate.where.id).toBe("notif_1");
    const expectedTrigger = calculateNotificationTrigger(dueDateOf(createdTask), 120);
    expect(notifUpdate.data.triggerAt).toBeDefined();
    expect((notifUpdate.data.triggerAt as Date).getTime()).toBe(expectedTrigger.getTime());
  });

  it("rechaza actualizar tarea de otro usuario", async () => {
    mTask.findUnique.mockResolvedValue(null);
    await expect(updateTask("task_1", "user_otro", { title: "x" })).rejects.toThrow(
      /no pertenece al usuario/,
    );
  });
});

describe("task-service — markTaskCompleted", () => {
  it("marca tarea como completada", async () => {
    mTask.findUnique.mockResolvedValue(createdTask);
    mTask.update.mockResolvedValue({ ...createdTask, completed: true });

    const result = await markTaskCompleted("task_1", "user_1");

    expect(result.completed).toBe(true);
    expect(mTask.update.mock.calls[0][0].data.completed).toBe(true);
  });
});

describe("task-service — deleteTask", () => {
  it("elimina tarea propia", async () => {
    mTask.findUnique.mockResolvedValue(createdTask);
    mTask.delete.mockResolvedValue(createdTask);

    await deleteTask("task_1", "user_1");

    expect(mTask.delete).toHaveBeenCalledTimes(1);
    expect(mTask.delete.mock.calls[0][0]).toEqual({ where: { id: "task_1" } });
  });

  it("rechaza eliminar tarea de otro usuario", async () => {
    mTask.findUnique.mockResolvedValue(null);
    await expect(deleteTask("task_1", "user_otro")).rejects.toThrow(/no pertenece al usuario/);
  });
});
