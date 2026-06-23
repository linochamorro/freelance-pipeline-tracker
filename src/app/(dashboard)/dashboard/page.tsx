"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardMetrics = {
  totalActive: number;
  totalPipelineValue: number;
  conversionRate: number;
  avgDaysPerStage: Record<string, number>;
  staleCount: number;
};

const STAGE_LABELS: Record<string, string> = {
  Lead: "Lead",
  Contacted: "Contacted",
  InDiscussion: "In Discussion",
  ProposalSent: "Proposal Sent",
  Negotiation: "Negotiation",
  Accepted: "Accepted",
  OnHold: "On Hold",
  InDevelopment: "In Development",
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMetrics(json.data);
      });
  }, []);

  if (!metrics) {
    return <div className="p-8 text-center text-neutral-500">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neutral-500">
              Active opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.totalActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neutral-500">
              Pipeline value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${metrics.totalPipelineValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neutral-500">
              Conversion rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {metrics.conversionRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neutral-500">
              Stale opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {metrics.staleCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average days per stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(metrics.avgDaysPerStage).map(([stage, days]) => (
              <div
                key={stage}
                className="flex items-center justify-between rounded-md border border-neutral-100 px-3 py-2"
              >
                <span className="text-sm text-neutral-600">
                  {STAGE_LABELS[stage] || stage}
                </span>
                <span className="text-sm font-medium">
                  {Math.round(days * 10) / 10}d
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
