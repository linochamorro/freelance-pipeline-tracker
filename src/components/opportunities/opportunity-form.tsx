"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";

type OpportunityFormProps = {
  onClose: () => void;
  onCreated: () => void;
};

export function OpportunityForm({ onClose, onCreated }: OpportunityFormProps) {
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactChannel, setContactChannel] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const budget = parseFloat(estimatedBudget);
    if (isNaN(budget) || budget <= 0) {
      setError("Budget must be a positive number");
      return;
    }
    if (!contactChannel) {
      setError("Please select a contact channel");
      return;
    }

    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          description,
          estimatedBudget: budget,
          contactPersonName,
          contactChannel,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create");
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New opportunity</DialogTitle>
          <DialogDescription>
            Add a new prospect or project to your pipeline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client name</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Project description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Estimated budget (USD)</Label>
            <Input
              id="budget"
              type="number"
              min="0"
              step="0.01"
              value={estimatedBudget}
              onChange={(e) => setEstimatedBudget(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact person</Label>
            <Input
              id="contactPerson"
              value={contactPersonName}
              onChange={(e) => setContactPersonName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel">Contact channel</Label>
            <Select value={contactChannel} onValueChange={setContactChannel}>
              <SelectTrigger id="channel">
                <SelectValue placeholder="Select channel" />
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
