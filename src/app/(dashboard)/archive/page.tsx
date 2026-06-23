"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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

  useEffect(() => {
    fetchArchived();
  }, []);

  async function fetchArchived(query?: string) {
    const url = query
      ? `/api/archive?search=${encodeURIComponent(query)}`
      : "/api/archive";
    const res = await fetch(url);
    if (res.status === 401) return router.push("/login");
    const json = await res.json();
    if (json.success) setOpportunities(json.data);
  }

  async function handleRestore(id: string) {
    await fetch("/api/archive", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId: id, action: "restore" }),
    });
    fetchArchived(search);
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Archive</h1>

      <Input
        placeholder="Search archived opportunities..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchArchived(e.target.value);
        }}
      />

      <div className="space-y-2">
        {opportunities.map((opp) => (
          <Card key={opp.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h3 className="text-sm font-medium">{opp.clientName}</h3>
                <p className="text-xs text-neutral-500">{opp.description}</p>
                <p className="text-xs text-neutral-400">
                  ${opp.estimatedBudget.toLocaleString()} &middot;{" "}
                  {opp.pipelineStage}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestore(opp.id)}
              >
                Restore
              </Button>
            </CardContent>
          </Card>
        ))}

        {opportunities.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-400">
            No archived opportunities
          </p>
        )}
      </div>
    </div>
  );
}
