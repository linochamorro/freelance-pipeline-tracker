// src/components/kanban/kanban-filters.tsx
// Barra de filtros por los 7 canales canónicos (ADR-004) y búsqueda textual en tiempo real.
// Enfoque visual: "Sharp, Calm, Dependable".

"use client";

import React from "react";
import { Search, Filter, X } from "lucide-react";
import { CONTACT_CHANNELS } from "@/lib/rules/contact-channels";
import type { ContactChannel } from "@/types";

export interface KanbanFiltersProps {
  selectedChannel: ContactChannel | "ALL";
  searchQuery: string;
  onChannelChange: (channel: ContactChannel | "ALL") => void;
  onSearchChange: (query: string) => void;
  onReset?: () => void;
  totalFiltered?: number;
  totalAll?: number;
}

export function KanbanFilters({
  selectedChannel,
  searchQuery,
  onChannelChange,
  onSearchChange,
  onReset,
  totalFiltered,
  totalAll,
}: KanbanFiltersProps) {
  const hasActiveFilters = selectedChannel !== "ALL" || searchQuery.trim() !== "";

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white  rounded-xl border border-slate-200  shadow-2xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
        {/* Campo de búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por cliente o descripción..."
            aria-label="Buscar por cliente o descripción"
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200  bg-slate-50  text-slate-800  placeholder-slate-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Selector de Canal Canónico */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 hidden sm:inline" />
          <label htmlFor="channel-select" className="sr-only">
            Filtrar por canal
          </label>
          <select
            id="channel-select"
            aria-label="Filtrar por canal"
            value={selectedChannel}
            onChange={(e) =>
              onChannelChange(e.target.value as ContactChannel | "ALL")
            }
            className="text-xs rounded-lg border border-slate-200  bg-slate-50  px-2.5 py-1.5 text-slate-800  focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <option value="ALL">Todos los canales</option>
            {CONTACT_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>

        {/* Botón de limpiar filtros */}
        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800  font-medium px-2 py-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Indicador de conteo de resultados */}
      {typeof totalFiltered === "number" && typeof totalAll === "number" && (
        <div className="text-xs text-slate-500  self-end sm:self-center">
          Mostrando <span className="font-semibold text-slate-700 ">{totalFiltered}</span> de {totalAll}
        </div>
      )}
    </div>
  );
}

