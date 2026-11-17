// src/components/kanban/kanban-column.tsx
// Columna individual del Tablero Kanban con cabecera fija, conteo, suma monetaria acumulada y zona Droppable @dnd-kit.
// Enfoque visual: "Sharp, Calm, Dependable" (WCAG 2.2 AA).

"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Banknote, Layers } from "lucide-react";

import { KanbanCard } from "./kanban-card";
import { formatPEN } from "@/lib/format-currency";
import type {
  PipelineStage,
  Opportunity,
  DevelopmentStatus,
  PaymentStatus,
} from "@/types";

export interface KanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onStageChange?: (opportunityId: string, toStage: PipelineStage) => void;
  onUpdateSubstate?: (
    opportunityId: string,
    updates: {
      developmentStatus?: DevelopmentStatus;
      paymentStatus?: PaymentStatus;
    },
  ) => void;
  onAddNote?: (opportunityId: string, content: string) => void;
  isStaleFn?: (opp: Opportunity) => boolean;
}

// Mapeo amigable de etapas a nombres en español
export const STAGE_TITLES: Record<PipelineStage, string> = {
  Lead: "Lead",
  Contacted: "Contactado",
  MeetingScheduled: "Reunión agendada",
  BriefReceived: "Brief recibido",
  ProposalSent: "Propuesta enviada",
  Negotiation: "Negociación",
  Accepted: "Aceptado",
  InProgress: "En progreso",
  Completed: "Completado",
  Rejected: "Rechazado",
};

// Acentos cromáticos sutiles por etapa
const STAGE_ACCENTS: Record<PipelineStage, string> = {
  Lead: "border-t-slate-400 bg-slate-500/10 text-slate-700 ",
  Contacted: "border-t-sky-400 bg-sky-500/10 text-sky-700 ",
  MeetingScheduled: "border-t-blue-500 bg-blue-500/10 text-blue-700 ",
  BriefReceived: "border-t-indigo-500 bg-indigo-500/10 text-indigo-700 ",
  ProposalSent: "border-t-purple-500 bg-purple-500/10 text-purple-700 ",
  Negotiation: "border-t-amber-500 bg-amber-500/10 text-amber-700 ",
  Accepted: "border-t-teal-500 bg-teal-500/10 text-teal-700 ",
  InProgress: "border-t-cyan-500 bg-cyan-500/10 text-cyan-700 ",
  Completed: "border-t-emerald-500 bg-emerald-500/10 text-emerald-700 ",
  Rejected: "border-t-rose-500 bg-rose-500/10 text-rose-700 ",
};

// M-2 (F05-T01 loop 2/3): la suma por columna usa el formateador compartido
// (PEN, símbolo literal "S/."). No hay conversión de divisas ni formateador
// local con otra moneda.

export function KanbanColumn({
  stage,
  opportunities,
  onUpdateSubstate,
  onAddNote,
  isStaleFn,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { stage },
  });

  const stageTitle = STAGE_TITLES[stage] || stage;
  const count = opportunities.length;
  const totalBudget = opportunities.reduce(
    (acc, opp) => acc + (opp.estimatedBudget || 0),
    0,
  );

  return (
    <section
      ref={setNodeRef}
      data-testid={`kanban-column-${stage}`}
      aria-label={`Columna ${stageTitle}: ${count} oportunidades`}
      role="region"
      className={`w-72 sm:w-80 shrink-0 flex flex-col rounded-xl border border-slate-200  bg-slate-50/70  max-h-[calc(100vh-14rem)] border-t-4 transition-colors ${
        STAGE_ACCENTS[stage]
      } ${
        isOver
          ? "ring-2 ring-indigo-500 bg-indigo-50/30 "
          : ""
      }`}
    >
      {/* Cabecera Fija de la Columna */}
      <header className="p-3.5 border-b border-slate-200  bg-white  rounded-t-lg sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-bold text-slate-800  truncate">
              {stageTitle}
            </h3>
            <span
              title={`${count} oportunidades`}
              className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100  text-slate-700 "
            >
              {count}
            </span>
          </div>

          <div
            className="flex items-center text-xs font-semibold text-slate-700  bg-slate-50  px-2 py-0.5 rounded-md"
            title={`Presupuesto total estimado: ${formatPEN(totalBudget)}`}
          >
            <Banknote
              className="w-3.5 h-3.5 text-emerald-600 mr-0.5"
              aria-hidden="true"
            />
            <span>{formatPEN(totalBudget)}</span>
          </div>
        </div>
      </header>

      {/* Lista de Tarjetas con scroll vertical si excede */}
      <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[160px]">
        {count === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200  rounded-lg text-slate-500  text-xs text-center p-3">
            <Layers className="w-5 h-5 mb-1.5 opacity-50" />
            <p className="font-medium">Sin oportunidades</p>
            <p className="text-[11px] text-slate-500">Arrastra una tarjeta aquí</p>
          </div>
        ) : (
          opportunities.map((opp) => (
            <KanbanCard
              key={opp.id}
              opportunity={opp}
              isStaleAlert={isStaleFn ? isStaleFn(opp) : false}
              onUpdateSubstate={onUpdateSubstate}
              onAddNote={onAddNote}
            />
          ))
        )}
      </div>
    </section>
  );
}

