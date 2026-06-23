"use client";

import { useState, useEffect } from "react";
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
  Contacted: "Contacted",
  InDiscussion: "In Discussion",
  ProposalSent: "Proposal Sent",
  Negotiation: "Negotiation",
  Accepted: "Accepted",
  Rejected: "Rejected",
  OnHold: "On Hold",
  InDevelopment: "In Development",
  Completed: "Completed",
};

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [newNote, setNewNote] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    fetchOpportunity();
  }, []);

  async function fetchOpportunity() {
    const res = await fetch(`/api/opportunities/${params.id}`);
    if (res.status === 401) return router.push("/login");
    const json = await res.json();
    if (json.success) setOpportunity(json.data);
  }

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

  if (!opportunity) {
    return <div className="p-8 text-center text-neutral-500">Loading...</div>;
  }

  const showPayment = PAYMENT_ACTIVE_STAGES.includes(opportunity.pipelineStage);
  const showDev = DEV_ACTIVE_STAGES.includes(opportunity.pipelineStage);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{opportunity.clientName}</h1>
          <p className="text-sm text-neutral-500">
            Created {new Date(opportunity.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleArchive}>
            Archive
          </Button>
          <Dialog open={showDelete} onOpenChange={setShowDelete}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete opportunity</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this opportunity? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDelete(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pipeline stage</Label>
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
              <Label>Contact channel</Label>
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
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="ColdOutreach">Cold outreach</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget">Estimated budget (USD)</Label>
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
              <Label>Contact person</Label>
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
            <Label htmlFor="desc">Description</Label>
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
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Quoted">Quoted</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Collected">Collected</SelectItem>
                </SelectContent>
              </Select>
            )}
            {showDev && (
              <Select
                value={opportunity.developmentStatus || undefined}
                onValueChange={(v) => handleSave("developmentStatus", v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Development" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="OnPause">On Pause</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
            />
            <Button type="submit">Add</Button>
          </form>

          <div className="space-y-3">
            {opportunity.notes.map((note) => (
              <div
                key={note.id}
                className="rounded-md border border-neutral-100 bg-neutral-50 p-3"
              >
                <p className="text-sm">{note.content}</p>
                <p className="mt-1 text-[10px] text-neutral-400">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {opportunity.notes.length === 0 && (
              <p className="text-center text-sm text-neutral-400">
                No notes yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stage history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {opportunity.stageChanges.map((change) => (
              <div
                key={change.id}
                className="flex items-center gap-2 text-sm text-neutral-600"
              >
                <Badge variant="secondary" className="text-[10px]">
                  {STAGE_LABELS[change.fromStage] || change.fromStage}
                </Badge>
                <span>&rarr;</span>
                <Badge variant="secondary" className="text-[10px]">
                  {STAGE_LABELS[change.toStage] || change.toStage}
                </Badge>
                <span className="text-[10px] text-neutral-400">
                  {new Date(change.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
            {opportunity.stageChanges.length === 0 && (
              <p className="text-center text-sm text-neutral-400">
                No stage changes yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
