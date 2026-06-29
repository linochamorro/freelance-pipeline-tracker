"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { OpportunityCard } from "./opportunity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Inbox } from "lucide-react";

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
      className={`flex w-72 shrink-0 flex-col rounded-lg bg-surface-subtle p-3 ${
        isOver ? "ring-2 ring-accent" : ""
      }`}
      role="region"
      aria-label={`Columna ${title}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="rounded-full bg-border px-2 py-0.5 text-xs text-ink-secondary">
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
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title="Sin oportunidades"
            description="Arrastra oportunidades aquí"
          />
        )}
      </div>
    </div>
  );
}
