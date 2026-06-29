"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/shared/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type Opportunity = {
  id: string;
  clientName: string;
  description: string;
  estimatedBudget: number;
  contactPersonName: string;
  contactChannel: string;
  pipelineStage: string;
  paymentStatus?: string | null;
  developmentStatus?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  notes: { id: string; content: string; createdAt: string }[];
  stageChanges: {
    id: string;
    fromStage: string;
    toStage: string;
    createdAt: string;
  }[];
};

const PAYMENT_ACTIVE_STAGES = [
  "ProposalSent", "Negotiation", "Accepted", "InDevelopment", "Completed",
];

const DEV_ACTIVE_STAGES = ["Accepted", "InDevelopment", "Completed"];

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

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [newNote, setNewNote] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchOpportunity = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/opportunities/${params.id}`);
      if (res.status === 401) return router.push("/login");
      const json = await res.json();
      if (json.success) setOpportunity(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchOpportunity();
  }, [fetchOpportunity]);

  async function handleSave(field: string, value: string | number | null) {
    await fetch(`/api/opportunities/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    fetchOpportunity();
  }

  async function handleDelete() {
    await fetch(`/api/opportunities/${params.id}`, { method: "DELETE" });
    router.push("/kanban");
  }

  async function handleArchive() {
    await fetch("/api/archive", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId: params.id,
        action: "archive",
      }),
    });
    router.push("/kanban");
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId: params.id,
        content: newNote,
      }),
    });
    setNewNote("");
    fetchOpportunity();
  }

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState onRetry={fetchOpportunity} />;
  if (!opportunity) return null;

  const showPayment = PAYMENT_ACTIVE_STAGES.includes(opportunity.pipelineStage);
  const showDev = DEV_ACTIVE_STAGES.includes(opportunity.pipelineStage);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-1 text-ink-muted hover:text-ink"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-ink">{opportunity.clientName}</h1>
            <p className="text-sm text-ink-secondary">
              Creado el {new Date(opportunity.createdAt).toLocaleDateString("es")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleArchive}>
            Archivar
          </Button>
          <Dialog open={showDelete} onOpenChange={setShowDelete}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Eliminar oportunidad</DialogTitle>
                <DialogDescription>
                  ¿Estás seguro? Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDelete(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Eliminar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Etapa del pipeline</Label>
              <Select
                value={opportunity.pipelineStage}
                onValueChange={(v) => handleSave("pipelineStage", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Canal de contacto</Label>
              <Select
                value={opportunity.contactChannel}
                onValueChange={(v) => handleSave("contactChannel", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Referral">Recomendación</SelectItem>
                  <SelectItem value="ColdOutreach">Contacto en frío</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget">Presupuesto estimado (USD)</Label>
              <Input
                id="budget"
                type="number"
                defaultValue={opportunity.estimatedBudget}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v !== opportunity.estimatedBudget) {
                    handleSave("estimatedBudget", v);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Persona de contacto</Label>
              <Input
                defaultValue={opportunity.contactPersonName}
                onBlur={(e) => {
                  if (e.target.value !== opportunity.contactPersonName) {
                    handleSave("contactPersonName", e.target.value);
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Descripción</Label>
            <Input
              id="desc"
              defaultValue={opportunity.description}
              onBlur={(e) => {
                if (e.target.value !== opportunity.description) {
                  handleSave("description", e.target.value);
                }
              }}
            />
          </div>

          <div className="flex gap-2">
            {showPayment && (
              <Select
                value={opportunity.paymentStatus || undefined}
                onValueChange={(v) => handleSave("paymentStatus", v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Quoted">Cotizado</SelectItem>
                  <SelectItem value="Pending">Pendiente</SelectItem>
                  <SelectItem value="Collected">Cobrado</SelectItem>
                </SelectContent>
              </Select>
            )}
            {showDev && (
              <Select
                value={opportunity.developmentStatus || undefined}
                onValueChange={(v) => handleSave("developmentStatus", v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Desarrollo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pendiente</SelectItem>
                  <SelectItem value="InProgress">En progreso</SelectItem>
                  <SelectItem value="OnPause">En pausa</SelectItem>
                  <SelectItem value="Completed">Completado</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Agregar una nota..."
              aria-label="Nueva nota"
            />
            <Button type="submit" size="sm">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </form>

          <div className="space-y-3">
            {opportunity.notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-border bg-surface-subtle p-3"
              >
                <p className="text-sm text-ink">{note.content}</p>
                <p className="mt-1 text-[10px] text-ink-muted">
                  {new Date(note.createdAt).toLocaleString("es")}
                </p>
              </div>
            ))}
            {opportunity.notes.length === 0 && (
              <EmptyState
                title="Sin notas"
                description="Agrega la primera nota sobre esta oportunidad."
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de etapas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {opportunity.stageChanges.map((change) => (
              <div
                key={change.id}
                className="flex items-center gap-2 text-sm text-ink-secondary"
              >
                <Badge variant="secondary" className="text-[10px]">
                  {STAGE_LABELS[change.fromStage] || change.fromStage}
                </Badge>
                <span className="text-ink-muted">&rarr;</span>
                <Badge variant="secondary" className="text-[10px]">
                  {STAGE_LABELS[change.toStage] || change.toStage}
                </Badge>
                <span className="text-[10px] text-ink-muted">
                  {new Date(change.createdAt).toLocaleString("es")}
                </span>
              </div>
            ))}
            {opportunity.stageChanges.length === 0 && (
              <EmptyState
                title="Sin cambios de etapa"
                description="El historial aparecerá cuando muevas esta oportunidad entre etapas."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
