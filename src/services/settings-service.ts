// src/services/settings-service.ts
// Servicio de configuración de usuario: lectura y actualización de UserSettings.
// Validación con SettingsUpdateSchema (contrato congelado en F01-T03).
// Campos gestionados: umbrales de inactividad por etapa, notificationEnabled.

import { PrismaClient } from "@prisma/client";
import { SettingsUpdateSchema } from "../lib/validations";
import type { UserSettings } from "@/types";

export const prisma = new PrismaClient();

/**
 * Obtiene la configuración del usuario. Si no existe, se crea con valores
 * por defecto de inicialización (ADR-003: 7 días en cada umbral como fallback).
 */
export async function getUserSettings(
  userId: string,
): Promise<UserSettings> {
  let settings = await prisma.userSettings.findUnique({ where: { userId } });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        userId,
        prospectionStalenessDays: 7,
        proposalStalenessDays: 7,
        executionStalenessDays: 7,
        billingStalenessDays: 7,
        closedStalenessDays: 7,
        notificationEnabled: true,
      },
    });
  }

  return settings;
}

/**
 * Actualiza la configuración del usuario validando con SettingsUpdateSchema.
 * El campo `id` del schema se valida pero no se usa para el WHERE (se usa userId).
 */
export async function updateUserSettings(
  userId: string,
  data: unknown,
): Promise<UserSettings> {
  const parsed = SettingsUpdateSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      `Datos de configuración inválidos: ${parsed.error.message}`,
    );
  }

  const { id: _unusedId, ...updateData } = parsed.data;

  return prisma.userSettings.update({
    where: { userId },
    data: updateData,
  });
}
