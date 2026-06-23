"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { KanbanColumn } from "./kanban-column";
import { OpportunityCard } from "./opportunity-card";
import { OpportunityForm } from "./opportunity-form";

type Opportunity = {
  id: string;
  clientName: string;
  description: string;
  estimatedBudget: number;
  updatedAt: string;
  paymentStatus?: string | null;
  developmentStatus?: string | null;
};

type KanbanBoardProps = {
  columns: { id: string; title: string; stalenessDays: number }[];
  opportunitiesByColumn: Record<string, Opportunity[]>;
  onStageChange: (id: string, newStage: string) => void;
  onOpportunityCreated: () => void;
};

const PIPELINE_STAGES = [
  "Lead", "Contacted", "InDiscussion", "ProposalSent",
  "Negotiation", "Accepted", "Rejected", "OnHold",
  "InDevelopment", "Completed",
] as const;

const DEFAULT_STALENESS = 7;

export function KanbanBoard({
  columns = PIPELINE_STAGES.map((s) => ({
    id: s,
    title: s.replace(/([A-Z])/g, " $1").trim(),
    stalenessDays: DEFAULT_STALENESS,
  })),
  opportunitiesByColumn,
  onStageChange,
  onOpportunityCreated,
}: KanbanBoardProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const overColumn = over.id.toString();
    if (PIPELINE_STAGES.includes(overColumn as typeof PIPELINE_STAGES[number])) {
      onStageChange(active.id.toString(), overColumn);
    }
  }

  const allOpportunities = Object.values(opportunitiesByColumn).flat();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pipeline</h1>
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          onClick={() => setShowForm(true)}
        >
          New opportunity
        </button>
      </div>

      {showForm && (
        <OpportunityForm
          onClose={() => setShowForm(false)}
          onCreated={onOpportunityCreated}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) => setActiveId(event.active.id.toString())}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ scrollBehavior: "smooth" }}
          role="application"
          aria-label="Kanban board"
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              opportunities={opportunitiesByColumn[column.id] || []}
              stalenessDays={column.stalenessDays}
              onOpportunityClick={(id) => router.push(`/opportunity/${id}`)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="w-72 opacity-80">
              <OpportunityCard
                id={activeId}
                {...(allOpportunities.find((o) => o.id === activeId) || {
                  clientName: "",
                  description: "",
                  estimatedBudget: 0,
                  updatedAt: new Date().toISOString(),
                })}
                stalenessDays={0}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
