"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StaleBadge } from "@/components/shared/stale-badge";

type OpportunityCardProps = {
  id: string;
  clientName: string;
  description: string;
  estimatedBudget: number;
  updatedAt: string;
  paymentStatus?: string | null;
  developmentStatus?: string | null;
  stalenessDays: number;
  onClick?: () => void;
};

export function OpportunityCard({
  id,
  clientName,
  description,
  estimatedBudget,
  updatedAt,
  paymentStatus,
  developmentStatus,
  stalenessDays,
  onClick,
}: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  const isStale = stalenessDays > 0 && daysSinceUpdate > stalenessDays;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="mb-2 cursor-grab active:cursor-grabbing"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
        aria-label={`Oportunidad: ${clientName}`}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-ink">{clientName}</h3>
            {isStale && <StaleBadge days={daysSinceUpdate} />}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-ink-secondary">
            {description}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-ink">
              ${estimatedBudget.toLocaleString("es")}
            </span>
            {paymentStatus && (
              <Badge variant="secondary" className="text-[10px]">
                {paymentStatus}
              </Badge>
            )}
            {developmentStatus && (
              <Badge variant="outline" className="text-[10px]">
                {developmentStatus}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[10px] text-ink-muted">
            hace {daysSinceUpdate}d
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
