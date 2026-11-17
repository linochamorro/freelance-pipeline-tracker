// src/components/kanban/kanban-board.tsx
// Tablero DnD accesible de 10 columnas, scroll superior sincronizado y soporte de teclado (@dnd-kit).
// Cumple con CA-03 (F02-T03): transiciones lineales, bloqueo terminales y experiencia Sharp, Calm, Dependable.

"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { PIPELINE_STAGES, canTransition, isTerminalStage } from "@/lib/rules/stage-transitions";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import type {
  Opportunity,
  PipelineStage,
  DevelopmentStatus,
  PaymentStatus,
} from "@/types";

export interface KanbanBoardProps {
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

export function KanbanBoard({
  opportunities,
  onStageChange,
  onUpdateSubstate,
  onAddNote,
  isStaleFn,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Opportunity | null>(null);

  // Scroll sincronizado entre barra superior y contenedor principal
  const topScrollRef = useRef<HTMLDivElement>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const handleTopScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    if (topScrollRef.current && boardScrollRef.current) {
      isSyncingScroll.current = true;
      boardScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  }, []);

  const handleBoardScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    if (topScrollRef.current && boardScrollRef.current) {
      isSyncingScroll.current = true;
      topScrollRef.current.scrollLeft = boardScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  }, []);

  // Sensores de DnD Kit: Puntero con umbral de 5px (para no interceptar clicks de botones) y Teclado
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, keyboardSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const opp = opportunities.find((o) => o.id === active.id);
    if (opp && !isTerminalStage(opp.pipelineStage)) {
      setActiveCard(opp);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const opp = opportunities.find((o) => o.id === active.id);
    if (!opp) return;

    // Etapa de origen
    const fromStage = opp.pipelineStage;

    // Identificar etapa de destino (over puede ser la columna o una tarjeta dentro de ella)
    let toStage: PipelineStage | null = null;
    if (PIPELINE_STAGES.includes(over.id as PipelineStage)) {
      toStage = over.id as PipelineStage;
    } else {
      const targetOpp = opportunities.find((o) => o.id === over.id);
      if (targetOpp) {
        toStage = targetOpp.pipelineStage;
      }
    }

    if (!toStage || toStage === fromStage) return;

    // Validar transición con las reglas de dominio
    if (canTransition(fromStage, toStage)) {
      onStageChange?.(opp.id, toStage);
    }
  };

  // Agrupar oportunidades por etapa
  const opportunitiesByStage: Record<PipelineStage, Opportunity[]> = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = opportunities.filter((o) => o.pipelineStage === stage);
      return acc;
    },
    {} as Record<PipelineStage, Opportunity[]>,
  );

  return (
    <div className="w-full flex flex-col space-y-2">
      {/* Barra de Scroll Superior Sincronizada */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        data-testid="kanban-top-scroll"
        aria-hidden="true"
        className="w-full overflow-x-auto h-3 scrollbar-thin scrollbar-thumb-slate-300  bg-slate-100/60  rounded-full select-none"
      >
        {/* Ancho virtual que refleja las 10 columnas */}
        <div className="w-[3250px] h-1" />
      </div>

      {/* Contenedor Principal del Tablero Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <main
          ref={boardScrollRef}
          onScroll={handleBoardScroll}
          data-testid="kanban-board-scroll"
          aria-label="Tablero Kanban de Oportunidades"
          tabIndex={0}
          className="w-full overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-300  focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
        >
          <div className="flex flex-row items-start gap-4 min-w-max p-1">
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                opportunities={opportunitiesByStage[stage] || []}
                onStageChange={onStageChange}
                onUpdateSubstate={onUpdateSubstate}
                onAddNote={onAddNote}
                isStaleFn={isStaleFn}
              />
            ))}
          </div>
        </main>

        {/* Drag Overlay para visualización fluida al arrastrar */}
        <DragOverlay>
          {activeCard ? (
            <div className="opacity-90 rotate-2 scale-105 shadow-2xl pointer-events-none">
              <KanbanCard
                opportunity={activeCard}
                isStaleAlert={isStaleFn ? isStaleFn(activeCard) : false}
                disabledDrag={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
