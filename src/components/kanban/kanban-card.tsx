// src/components/kanban/kanban-card.tsx
// Tarjeta de Oportunidad con animación 3D Flip, accesibilidad WCAG 2.2 AA y bloqueo en etapas terminales.
// Enfoque visual: "Sharp, Calm, Dependable" (slate, acentos indigo/amber/rose).

"use client";

import React, { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Lock,
  MessageSquare,
  Banknote,
  Linkedin,
  Mail,
  Users,
  Compass,
  Phone,
  HelpCircle,
} from "lucide-react";

import { isTerminalStage } from "@/lib/rules/stage-transitions";
import { formatPEN } from "@/lib/format-currency";
import {
  DEVELOPMENT_STATUSES,
  PAYMENT_STATUSES,
} from "@/lib/rules/substate-activation";
import type {
  Opportunity,
  ContactChannel,
  DevelopmentStatus,
  PaymentStatus,
} from "@/types";

export interface KanbanCardProps {
  opportunity: Opportunity;
  isStaleAlert?: boolean;
  onUpdateSubstate?: (
    opportunityId: string,
    updates: {
      developmentStatus?: DevelopmentStatus;
      paymentStatus?: PaymentStatus;
    },
  ) => void;
  onAddNote?: (opportunityId: string, content: string) => void;
  disabledDrag?: boolean;
}

// Mapeo legible de canales
const CHANNEL_META: Record<
  ContactChannel,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  LinkedIn: { label: "LinkedIn", icon: Linkedin },
  Email: { label: "Email", icon: Mail },
  Referral: { label: "Referido", icon: Users },
  ColdOutreach: { label: "Cold Outreach", icon: Compass },
  WhatsApp: { label: "WhatsApp", icon: MessageSquare },
  Phone: { label: "Teléfono", icon: Phone },
  Other: { label: "Otro", icon: HelpCircle },
};

// M-2 (F05-T01 loop 2/3): la presentación monetaria usa el formateador
// compartido (PEN, símbolo literal "S/."). No hay conversión de divisas ni
// formateador local con otra moneda.

export function KanbanCard({
  opportunity,
  isStaleAlert = false,
  onUpdateSubstate,
  onAddNote,
  disabledDrag = false,
}: KanbanCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
      );
    }
    return false;
  });

  // Detección reactiva de cambios en prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      if (!mq) return;
      setPrefersReducedMotion(mq.matches ?? false);
      const listener = (e: MediaQueryListEvent) =>
        setPrefersReducedMotion(e.matches);
      mq.addEventListener?.("change", listener);
      return () => mq.removeEventListener?.("change", listener);
    }
  }, []);

  const isTerminal = isTerminalStage(opportunity.pipelineStage);
  const canDrag = !isTerminal && !disabledDrag && !isFlipped;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: opportunity.id,
      disabled: !canDrag,
      data: { opportunity },
    });

  const dragStyle: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.4 : 1,
    cursor: canDrag ? "grab" : isTerminal ? "not-allowed" : "default",
  };

  const isDevStatusAllowed = opportunity.pipelineStage === "Accepted";
  const isPayStatusAllowed = opportunity.pipelineStage === "ProposalSent";

  const ChannelIcon =
    CHANNEL_META[opportunity.contactChannel]?.icon || HelpCircle;
  const channelLabel =
    CHANNEL_META[opportunity.contactChannel]?.label || opportunity.contactChannel;

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    onAddNote?.(opportunity.id, quickNote.trim());
    setQuickNote("");
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      data-testid={`kanban-card-${opportunity.id}`}
      data-flipped={isFlipped ? "true" : "false"}
      data-draggable={canDrag ? "true" : "false"}
      role="article"
      tabIndex={0}
      aria-label={`Oportunidad: ${opportunity.clientName}, Etapa: ${opportunity.pipelineStage}`}
      className={`group relative rounded-xl bg-white  border border-slate-200  shadow-xs hover:shadow-md transition-shadow duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${
        prefersReducedMotion ? "motion-reduce" : ""
      }`}
    >
      {/* Contenedor 3D Perspective */}
      <div
        className="w-full relative"
        style={{
          perspective: 1000,
        }}
      >
        <div
          className={`w-full transition-transform duration-300 ${
            prefersReducedMotion ? "transition-none" : ""
          }`}
          data-testid="kanban-card-flip-surface"
          style={{
            display: "grid",
            transformStyle: prefersReducedMotion ? "flat" : "preserve-3d",
            transform: isFlipped
              ? prefersReducedMotion
                ? "none"
                : "rotateY(180deg)"
              : "none",
          }}
        >
          {/* ===================== FRENTE DE LA TARJETA ===================== */}
          <div
            className={`p-4 flex flex-col gap-3 ${
              isFlipped && prefersReducedMotion ? "hidden" : ""
            }`}
            data-testid="kanban-card-front"
            style={{
              gridArea: "1 / 1",
              backfaceVisibility: prefersReducedMotion ? "visible" : "hidden",
              WebkitBackfaceVisibility: prefersReducedMotion
                ? "visible"
                : "hidden",
              transform: prefersReducedMotion ? "none" : "rotateY(0deg)",
            }}
          >
            {/* Cabecera de la tarjeta: Cliente y Botón Flip */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900  truncate">
                  {opportunity.clientName}
                </h4>
                {opportunity.contactPersonName && (
                  <p className="text-xs text-slate-500  truncate">
                    {opportunity.contactPersonName}
                  </p>
                )}
              </div>

              {/* Botón 3D Flip */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(true);
                }}
                aria-expanded={isFlipped}
                aria-label="Girar tarjeta para ver detalles y notas"
                className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50  transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            {/* Descripción breve */}
            <p className="text-xs text-slate-600  line-clamp-2 leading-relaxed">
              {opportunity.description}
            </p>

            {/* Presupuesto y Canal */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 ">
              <div className="flex items-center font-semibold text-slate-800 ">
                <Banknote
                  className="w-3.5 h-3.5 text-emerald-600 mr-0.5"
                  aria-hidden="true"
                />
                <span>{formatPEN(opportunity.estimatedBudget)}</span>
              </div>

              <div
                className="flex items-center gap-1 text-slate-500  text-[11px] bg-slate-50  px-2 py-0.5 rounded-md"
                title={`Canal: ${channelLabel}`}
              >
                <ChannelIcon className="w-3.5 h-3.5 text-slate-600 " />
                <span className="truncate max-w-[80px]">{channelLabel}</span>
              </div>
            </div>

            {/* Badges de estado / staleness / terminal */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              {isStaleAlert && (
                <span
                  data-testid="stale-indicator"
                  className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50   px-2 py-0.5 rounded-full border border-amber-200 "
                >
                  <AlertTriangle className="w-3 h-3" />
                  Inactiva (Stale)
                </span>
              )}

              {isTerminal && (
                <span
                  data-testid="terminal-badge"
                  className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100   px-2 py-0.5 rounded-full"
                >
                  <Lock className="w-3 h-3" />
                  Terminal
                </span>
              )}

              {opportunity.paymentStatus && (
                <span className="font-medium text-emerald-700 bg-emerald-50   px-1.5 py-0.5 rounded-md text-[10px]">
                  Cobro: {opportunity.paymentStatus}
                </span>
              )}

              {opportunity.developmentStatus && (
                <span className="font-medium text-sky-700 bg-sky-50   px-1.5 py-0.5 rounded-md text-[10px]">
                  Dev: {opportunity.developmentStatus}
                </span>
              )}
            </div>
          </div>

          {/* ===================== DORSO DE LA TARJETA (Giro 3D) ===================== */}
          <div
            className={`p-4 flex flex-col gap-3 bg-slate-50  rounded-xl border border-indigo-100  ${
              !isFlipped && prefersReducedMotion ? "hidden" : ""
            }`}
            data-testid="kanban-card-back"
            style={{
              gridArea: "1 / 1",
              backfaceVisibility: prefersReducedMotion ? "visible" : "hidden",
              WebkitBackfaceVisibility: prefersReducedMotion
                ? "visible"
                : "hidden",
              transform: prefersReducedMotion ? "none" : "rotateY(180deg)",
            }}
          >
            {/* Cabecera dorso: Volver al frente */}
            <div className="flex items-center justify-between border-b border-slate-200  pb-2">
              <span className="text-xs font-semibold text-slate-700 ">
                Acciones y Subestados
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                aria-label="Volver al frente de la tarjeta"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800  font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            {/* Selector de DevelopmentStatus */}
            <div className="space-y-1">
              <label
                htmlFor={`dev-status-${opportunity.id}`}
                className="block text-[11px] font-medium text-slate-600 "
              >
                Estado de desarrollo:
              </label>
              <select
                id={`dev-status-${opportunity.id}`}
                aria-label="Estado de desarrollo"
                disabled={!isDevStatusAllowed}
                value={opportunity.developmentStatus || ""}
                onChange={(e) =>
                  onUpdateSubstate?.(opportunity.id, {
                    developmentStatus: (e.target.value as DevelopmentStatus) || undefined,
                  })
                }
                className="w-full text-xs rounded-md border border-slate-300  bg-white  px-2 py-1 text-slate-800  disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="">(Sin asignar)</option>
                {DEVELOPMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {!isDevStatusAllowed && (
                <p className="text-[10px] text-slate-500 italic">
                  Solo modificable en etapa Aceptado
                </p>
              )}
            </div>

            {/* Selector de PaymentStatus */}
            <div className="space-y-1">
              <label
                htmlFor={`pay-status-${opportunity.id}`}
                className="block text-[11px] font-medium text-slate-600 "
              >
                Estado de cobro / pago:
              </label>
              <select
                id={`pay-status-${opportunity.id}`}
                aria-label="Estado de cobro o pago"
                disabled={!isPayStatusAllowed}
                value={opportunity.paymentStatus || ""}
                onChange={(e) =>
                  onUpdateSubstate?.(opportunity.id, {
                    paymentStatus: (e.target.value as PaymentStatus) || undefined,
                  })
                }
                className="w-full text-xs rounded-md border border-slate-300  bg-white  px-2 py-1 text-slate-800  disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="">(Sin asignar)</option>
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {!isPayStatusAllowed && (
                <p className="text-[10px] text-slate-500 italic">
                  Solo modificable en etapa Propuesta enviada
                </p>
              )}
            </div>

            {/* Formulario de Nota Rápida (Append-only) */}
            <form onSubmit={handleNoteSubmit} className="space-y-1.5 pt-1">
              <label
                htmlFor={`note-input-${opportunity.id}`}
                className="block text-[11px] font-medium text-slate-600 "
              >
                Nueva nota inmutable:
              </label>
              <div className="flex gap-1.5">
                <input
                  id={`note-input-${opportunity.id}`}
                  type="text"
                  placeholder="Escribe una nota rápida..."
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="flex-1 text-xs rounded-md border border-slate-300  bg-white  px-2 py-1 text-slate-800  focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!quickNote.trim()}
                  aria-label="Guardar nota rápida"
                  className="px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
                >
                  Guardar nota
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

