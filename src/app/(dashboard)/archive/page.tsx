"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from "@/components/shared/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Archive, RotateCcw } from "lucide-react";

type ArchivedOpportunity = {
  id: string;
  clientName: string;
  description: string;
  estimatedBudget: number;
  pipelineStage: string;
  updatedAt: string;
};

export default function ArchivePage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<ArchivedOpportunity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchArchived = useCallback(async (query?: string) => {
    setLoading(true);
    setError(false);
    try {
      const url = query
        ? `/api/archive?search=${encodeURIComponent(query)}`
        : "/api/archive";
      const res = await fetch(url);
      if (res.status === 401) return router.push("/login");
      const json = await res.json();
      if (json.success) setOpportunities(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  async function handleRestore(id: string) {
    await fetch("/api/archive", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId: id, action: "restore" }),
    });
    fetchArchived(search);
  }

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState onRetry={() => fetchArchived()} />;

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold text-ink">Archivo</h1>

      <Input
        placeholder="Buscar oportunidades archivadas..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchArchived(e.target.value);
        }}
        aria-label="Buscar en archivo"
      />

      <div className="space-y-2">
        {opportunities.map((opp) => (
          <Card key={opp.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h3 className="text-sm font-medium text-ink">{opp.clientName}</h3>
                <p className="text-xs text-ink-secondary">{opp.description}</p>
                <p className="text-xs text-ink-muted">
                  ${opp.estimatedBudget.toLocaleString("es")} &middot;{" "}
                  {opp.pipelineStage}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestore(opp.id)}
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar
              </Button>
            </CardContent>
          </Card>
        ))}

        {!loading && opportunities.length === 0 && (
          <EmptyState
            icon={<Archive className="h-10 w-10" />}
            title="Archivo vacío"
            description="Las oportunidades archivadas aparecerán aquí."
            action={
              <a
                href="/kanban"
                className="text-sm text-accent underline underline-offset-4 hover:text-accent-hover"
              >
                Ir al Pipeline
              </a>
            }
          />
        )}
      </div>
    </div>
  );
}
