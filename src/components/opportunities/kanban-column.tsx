"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { OpportunityCard } from "./opportunity-card";

type Opportunity = {
  id: string;
  clientName: string;
  description: string;
  estimatedBudget: number;
  updatedAt: string;
  paymentStatus?: string | null;
  developmentStatus?: string | null;
};

type KanbanColumnProps = {
  title: string;
  id: string;
  opportunities: Opportunity[];
  stalenessDays: number;
  onOpportunityClick?: (id: string) => void;
};

export function KanbanColumn({
  title,
  id,
  opportunities,
  stalenessDays,
  onOpportunityClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg bg-neutral-50 p-3 ${
        isOver ? "ring-2 ring-neutral-400" : ""
      }`}
      role="region"
      aria-label={`${title} column`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
          {opportunities.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SortableContext
          items={opportunities.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              id={opportunity.id}
              clientName={opportunity.clientName}
              description={opportunity.description}
              estimatedBudget={opportunity.estimatedBudget}
              updatedAt={opportunity.updatedAt}
              paymentStatus={opportunity.paymentStatus}
              developmentStatus={opportunity.developmentStatus}
              stalenessDays={stalenessDays}
              onClick={() => onOpportunityClick?.(opportunity.id)}
            />
          ))}
        </SortableContext>

        {opportunities.length === 0 && (
          <p className="py-8 text-center text-xs text-neutral-400">
            No opportunities
          </p>
        )}
      </div>
    </div>
  );
}
