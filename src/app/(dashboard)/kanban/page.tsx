"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/opportunities/kanban-board";
import { PageSkeleton } from "@/components/shared/skeleton";
import { ErrorState } from "@/components/shared/error-state";

type Opportunity = {
  id: string;
  clientName: string;
  description: string;
  estimatedBudget: number;
  updatedAt: string;
  paymentStatus?: string | null;
  developmentStatus?: string | null;
  pipelineStage: string;
};

const PIPELINE_STAGES = [
  "Lead", "Contacted", "InDiscussion", "ProposalSent",
  "Negotiation", "Accepted", "Rejected", "OnHold",
  "InDevelopment", "Completed",
] as const;

const STAGE_LABELS: Record<string, string> = {
  Lead: "Lead",
  Contacted: "Contactado",
  InDiscussion: "En conversación",
  ProposalSent: "Propuesta enviada",
  Negotiation: "Negociación",
  Accepted: "Aceptado",
  Rejected: "Rechazado",
  OnHold: "En espera",
  InDevelopment: "En desarrollo",
  Completed: "Completado",
};

export default function KanbanPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/opportunities");
      if (res.status === 401) router.push("/login");
      const json = await res.json();
      if (json.success) setOpportunities(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const opportunitiesByColumn: Record<string, Opportunity[]> = {};
  for (const stage of PIPELINE_STAGES) {
    opportunitiesByColumn[stage] = opportunities.filter(
      (o) => o.pipelineStage === stage,
    );
  }

  const columns = PIPELINE_STAGES.map((s) => ({
    id: s,
    title: STAGE_LABELS[s],
    stalenessDays: 7,
  }));

  async function handleStageChange(id: string, newStage: string) {
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, pipelineStage: newStage } : o,
      ),
    );

    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: newStage }),
    });

    if (!res.ok) {
      fetchOpportunities();
    }
  }

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState onRetry={fetchOpportunities} />;

  return (
    <div className="p-4">
      <KanbanBoard
        columns={columns}
        opportunitiesByColumn={opportunitiesByColumn}
        onStageChange={handleStageChange}
        onOpportunityCreated={fetchOpportunities}
      />
    </div>
  );
}
