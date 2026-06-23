import { prisma } from "@/lib/db";

/** Auto-siembra la configuración predeterminada en el primer acceso para que la página de ajustes siempre tenga un registro que actualizar sin requerir una llamada de inicialización separada en el registro. */
export async function getUserSettings(userId: string) {
  let settings = await prisma.userSettings.findUnique({ where: { userId } });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId },
    });
  }

  return settings;
}

/** Aplica upsert para manejar el caso de primera vez (sin fila UserSettings aún) sin una verificación de existencia separada que podría generar condiciones de carrera bajo peticiones concurrentes. */
export async function updateUserSettings(
  userId: string,
  data: Partial<{
    leadStalenessDays: number;
    contactedStalenessDays: number;
    discussionStalenessDays: number;
    proposalStalenessDays: number;
    negotiationStalenessDays: number;
    acceptedStalenessDays: number;
    onHoldStalenessDays: number;
    developmentStalenessDays: number;
    notificationEnabled: boolean;
  }>,
) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });

  if (!existing) {
    return prisma.userSettings.create({ data: { userId, ...data } });
  }

  return prisma.userSettings.update({
    where: { userId },
    data,
  });
}
