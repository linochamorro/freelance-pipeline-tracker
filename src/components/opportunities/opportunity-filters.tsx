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
          <SelectValue placeholder="Todas las etapas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas las etapas</SelectItem>
          <SelectItem value="Lead">Lead</SelectItem>
          <SelectItem value="Contacted">Contactado</SelectItem>
          <SelectItem value="InDiscussion">En conversación</SelectItem>
          <SelectItem value="ProposalSent">Propuesta enviada</SelectItem>
          <SelectItem value="Negotiation">Negociación</SelectItem>
          <SelectItem value="Accepted">Aceptado</SelectItem>
          <SelectItem value="OnHold">En espera</SelectItem>
          <SelectItem value="InDevelopment">En desarrollo</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.contactChannel || ""}
        onValueChange={(v) =>
          onChange({ ...filters, contactChannel: v || undefined })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Todos los canales" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos los canales</SelectItem>
          <SelectItem value="LinkedIn">LinkedIn</SelectItem>
          <SelectItem value="Email">Email</SelectItem>
          <SelectItem value="Referral">Recomendación</SelectItem>
          <SelectItem value="ColdOutreach">Contacto en frío</SelectItem>
          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
          <SelectItem value="Other">Otro</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Buscar por nombre o descripción..."
        className="w-56"
        value={filters.search || ""}
        onChange={(e) =>
          onChange({ ...filters, search: e.target.value || undefined })
        }
        aria-label="Buscar oportunidades"
      />
    </div>
  );
}
