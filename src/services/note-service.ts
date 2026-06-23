import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/** Verifica la propiedad antes de insertar para que los usuarios no puedan añadir notas a oportunidades que no les pertenecen. Las notas son de solo añadidura por diseño — no se expone edición ni eliminación. */
export async function addNote(opportunityId: string, userId: string, content: string) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
  });
  if (!opportunity) throw new Error("Opportunity not found");

  const note = await prisma.note.create({
    data: { opportunityId, content },
  });

  logger.info({ noteId: note.id, opportunityId }, "Note added");
  return note;
}

export async function getNotesByOpportunity(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
  });
  if (!opportunity) throw new Error("Opportunity not found");

  return prisma.note.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "asc" },
  });
}
