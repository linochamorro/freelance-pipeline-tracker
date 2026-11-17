// src/services/note-service.ts
// Servicio de dominio para el registro de notas bajo principio estricto Append-Only (ADR-002).
// Inmutable: solo inserción y lectura cronológica. Sin métodos de edición ni borrado.
// Aislamiento estricto por userId (previsión IDOR).

import { PrismaClient } from "@prisma/client";
import type { Note } from "@/types";

export const prisma = new PrismaClient();

export interface NoteCreateData {
  opportunityId: string;
  userId: string;
  content: string;
}

export async function createNote(data: NoteCreateData): Promise<Note> {
  if (!data.content || !data.content.trim()) {
    throw new Error("El contenido de la nota no puede estar vacío");
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: data.opportunityId },
  });

  if (!opportunity || opportunity.userId !== data.userId) {
    throw new Error("Oportunidad no encontrada o acceso denegado");
  }

  return prisma.note.create({
    data: {
      opportunityId: data.opportunityId,
      content: data.content.trim(),
    },
  });
}

export async function listNotes(
  opportunityId: string,
  userId: string,
): Promise<Note[]> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity || opportunity.userId !== userId) {
    throw new Error("Oportunidad no encontrada o acceso denegado");
  }

  return prisma.note.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "asc" },
  });
}
