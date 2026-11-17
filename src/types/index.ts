// src/types/index.ts
// Tipos globales compartidos — Congelados en F01-T03 (contrato para Fases 2, 3, 4)
// Estricto TypeScript. Sin valores de secretos.

import type {
  PipelineStage,
  PaymentStatus,
  DevelopmentStatus,
  ContactChannel,
  User,
  Opportunity,
  Task,
  UserSettings,
  Notification,
  Note,
  StageChange,
  SubStateChange,
  Account,
  Session,
  VerificationToken,
} from "@prisma/client";

// --- Re-export de tipos de modelo Prisma (canónicos) ---
export type {
  User,
  Opportunity,
  Task,
  UserSettings,
  Notification,
  Note,
  StageChange,
  SubStateChange,
  Account,
  Session,
  VerificationToken,
};

// --- Enums canónicos (re-exportados desde Prisma) ---
export type { PipelineStage, PaymentStatus, DevelopmentStatus, ContactChannel };

// --- Valores canónicos de enums (para Zod, UI y reglas de dominio) ---
export const PipelineStageEnum = {
  Lead: "Lead" as PipelineStage,
  Contacted: "Contacted" as PipelineStage,
  MeetingScheduled: "MeetingScheduled" as PipelineStage,
  BriefReceived: "BriefReceived" as PipelineStage,
  ProposalSent: "ProposalSent" as PipelineStage,
  Negotiation: "Negotiation" as PipelineStage,
  Accepted: "Accepted" as PipelineStage,
  InProgress: "InProgress" as PipelineStage,
  Completed: "Completed" as PipelineStage,
  Rejected: "Rejected" as PipelineStage,
} as const;

export const PaymentStatusEnum = {
  Pending: "Pending" as PaymentStatus,
  PartialPaid: "PartialPaid" as PaymentStatus,
  Paid: "Paid" as PaymentStatus,
  Refunded: "Refunded" as PaymentStatus,
} as const;

export const DevelopmentStatusEnum = {
  NotStarted: "NotStarted" as DevelopmentStatus,
  InProgress: "InProgress" as DevelopmentStatus,
  InReview: "InReview" as DevelopmentStatus,
  Delivered: "Delivered" as DevelopmentStatus,
} as const;

export const ContactChannelEnum = {
  LinkedIn: "LinkedIn" as ContactChannel,
  Email: "Email" as ContactChannel,
  Referral: "Referral" as ContactChannel,
  ColdOutreach: "ColdOutreach" as ContactChannel,
  WhatsApp: "WhatsApp" as ContactChannel,
  Phone: "Phone" as ContactChannel,
  Other: "Other" as ContactChannel,
} as const;

// --- Opciones de adelanto de tareas (ADR-005) ---
export const TASK_LEAD_MINUTES_OPTIONS = [15, 30, 60, 120, 1440] as const;
export type TaskLeadMinutes = (typeof TASK_LEAD_MINUTES_OPTIONS)[number];

export interface TaskLeadOption {
  value: TaskLeadMinutes;
  label: string;
}

export const TASK_LEAD_OPTIONS: readonly TaskLeadOption[] = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora (60 minutos)" },
  { value: 120, label: "2 horas (120 minutos)" },
  { value: 1440, label: "1 día (1440 minutos)" },
] as const;

// --- Tipos de UserSettings (ADR-003: staleness configurable por usuario) ---
export interface UserSettingsStalenessDays {
  prospectionStalenessDays: number;
  proposalStalenessDays: number;
  executionStalenessDays: number;
  billingStalenessDays: number;
  closedStalenessDays: number;
}

export type UserSettingsInput = Pick<
  UserSettings,
  | "prospectionStalenessDays"
  | "proposalStalenessDays"
  | "executionStalenessDays"
  | "billingStalenessDays"
  | "closedStalenessDays"
  | "notificationEnabled"
>;

export type UserSettingsUpdate = Partial<UserSettingsInput>;
