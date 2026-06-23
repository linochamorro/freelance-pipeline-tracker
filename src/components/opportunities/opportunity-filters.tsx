"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Filters = {
  contactChannel?: string;
  pipelineStage?: string;
  paymentStatus?: string;
  developmentStatus?: string;
  search?: string;
};

type OpportunityFiltersProps = {
  filters: Filters;
  onChange: (filters: Filters) => void;
};

export function OpportunityFilters({ filters, onChange }: OpportunityFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={filters.pipelineStage || ""}
        onValueChange={(v) =>
          onChange({ ...filters, pipelineStage: v || undefined })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All stages</SelectItem>
          <SelectItem value="Lead">Lead</SelectItem>
          <SelectItem value="Contacted">Contacted</SelectItem>
          <SelectItem value="InDiscussion">In Discussion</SelectItem>
          <SelectItem value="ProposalSent">Proposal Sent</SelectItem>
          <SelectItem value="Negotiation">Negotiation</SelectItem>
          <SelectItem value="Accepted">Accepted</SelectItem>
          <SelectItem value="OnHold">On Hold</SelectItem>
          <SelectItem value="InDevelopment">In Development</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.contactChannel || ""}
        onValueChange={(v) =>
          onChange({ ...filters, contactChannel: v || undefined })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All channels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All channels</SelectItem>
          <SelectItem value="LinkedIn">LinkedIn</SelectItem>
          <SelectItem value="Email">Email</SelectItem>
          <SelectItem value="Referral">Referral</SelectItem>
          <SelectItem value="ColdOutreach">Cold outreach</SelectItem>
          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
          <SelectItem value="Other">Other</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Search by name or description..."
        className="w-56"
        value={filters.search || ""}
        onChange={(e) =>
          onChange({ ...filters, search: e.target.value || undefined })
        }
      />
    </div>
  );
}
