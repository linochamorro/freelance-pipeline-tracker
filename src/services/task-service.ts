// src/services/task-service.ts
// Servicio de dominio para tareas autónomas (ADR-005).
// CRUD con aislamiento por userId y cálculo automático de trigger de notificación.

import { PrismaClient } from "@prisma/client";
import { calculateNotificationTrigger, isValidLeadMinutes } from "../lib/rules/task-schedule";
import type { Task, TaskLeadMinutes } from "@/types";

export const prisma = new PrismaClient();

export interface TaskCreateData {
  userId: string;
  title: string;
  description: string;
  dueDate: Date | string;
  leadMinutes: TaskLeadMinutes;
  opportunityId?: string | null;
}

export interface TaskUpdateData {
  title?: string;
  description?: string;
  dueDate?: Date | string;
  leadMinutes?: TaskLeadMinutes;
  opportunityId?: string | null;
  completed?: boolean;
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : new Date(value.getTime());
}

export async function createTask(data: TaskCreateData): Promise<Task> {
  if (!isValidLeadMinutes(data.leadMinutes)) {
    throw new Error(`leadMinutes inválido: ${data.leadMinutes}`);
  }

  const dueDate = toDate(data.dueDate);
  const triggerAt = calculateNotificationTrigger(dueDate, data.leadMinutes);

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        dueDate,
        leadMinutes: data.leadMinutes,
        opportunityId: data.opportunityId ?? undefined,
      },
    });

    await tx.notification.create({
      data: {
        userId: data.userId,
        taskId: task.id,
        title: `Recordatorio: ${data.title}`,
        message: `La tarea "${data.title}" vence el ${dueDate.toISOString()}`,
        triggerAt,
        sentEmail: false,
        readInApp: false,
      },
    });

    return task;
  });
}

export async function listTasks(userId: string): Promise<Task[]> {
  return prisma.task.findMany({
    where: { userId },
    orderBy: { dueDate: "asc" },
    include: { notifications: true },
  });
}

export async function updateTask(id: string, userId: string, data: TaskUpdateData): Promise<Task> {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Tarea no encontrada o no pertenece al usuario");
  }

  const dueDate = data.dueDate !== undefined ? toDate(data.dueDate) : existing.dueDate;
  const leadMinutes = data.leadMinutes ?? existing.leadMinutes;

  if (!isValidLeadMinutes(leadMinutes)) {
    throw new Error(`leadMinutes inválido: ${leadMinutes}`);
  }

  const triggerAt = calculateNotificationTrigger(dueDate, leadMinutes);
  const title = data.title ?? existing.title;

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        description: data.description ?? undefined,
        dueDate: data.dueDate !== undefined ? dueDate : undefined,
        leadMinutes: data.leadMinutes ?? undefined,
        opportunityId: data.opportunityId ?? undefined,
        completed: data.completed ?? undefined,
      },
    });

    const existingNotification = await tx.notification.findFirst({
      where: { taskId: id },
    });

    if (existingNotification) {
      await tx.notification.update({
        where: { id: existingNotification.id },
        data: {
          title: `Recordatorio: ${title}`,
          message: `La tarea "${title}" vence el ${dueDate.toISOString()}`,
          triggerAt,
        },
      });
    } else {
      await tx.notification.create({
        data: {
          userId,
          taskId: id,
          title: `Recordatorio: ${title}`,
          message: `La tarea "${title}" vence el ${dueDate.toISOString()}`,
          triggerAt,
          sentEmail: false,
          readInApp: false,
        },
      });
    }

    return task;
  });
}

export async function markTaskCompleted(id: string, userId: string): Promise<Task> {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Tarea no encontrada o no pertenece al usuario");
  }

  return prisma.task.update({
    where: { id },
    data: { completed: true },
  });
}

export async function deleteTask(id: string, userId: string): Promise<Task> {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Tarea no encontrada o no pertenece al usuario");
  }

  return prisma.task.delete({ where: { id } });
}
