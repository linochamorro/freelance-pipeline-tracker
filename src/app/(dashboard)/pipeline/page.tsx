// src/app/(dashboard)/pipeline/page.tsx
// Vista principal interactiva del Tablero Kanban comercial con estados empty, loading y error.
// Soporte para filtros en tiempo real, mutación de etapas, subestados y registro de notas inmutables.
// Enfoque visual: "Sharp, Calm, Dependable" (WCAG 2.2 AA).

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  KanbanBoard,
  KanbanFilters,
} from "@/components/kanban";
import { isStale, defaultStalenessThresholds } from "@/lib/rules/staleness";
import type {
  Opportunity,
  PipelineStage,
  ContactChannel,
  DevelopmentStatus,
  PaymentStatus,
} from "@/types";
import {
  AlertCircle,
  RefreshCw,
  FolderPlus,
  Loader2,
  Kanban as KanbanIcon,
  Plus,
} from "lucide-react";
import {
  OpportunityForm,
  type CreateOpportunityFormData,
} from "@/components/kanban/opportunity-form";

export interface PipelinePageProps {
  initialOpportunities?: Opportunity[];
  initialLoading?: boolean;
  initialError?: string | null;
  onRetry?: () => void;
}

export default function PipelinePage({
  initialOpportunities,
  initialLoading = false,
  initialError = null,
  onRetry,
}: PipelinePageProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(
    initialOpportunities || [],
  );
  const [loading, setLoading] = useState<boolean>(
    initialLoading ?? !initialOpportunities,
  );
  const [error, setError] = useState<string | null>(initialError);
  const [isOpportunityFormOpen, setIsOpportunityFormOpen] = useState(false);
  const [isCreatingOpportunity, setIsCreatingOpportunity] = useState(false);
  const [opportunityCreateError, setOpportunityCreateError] = useState<string | null>(null);

  // Estados de Filtros
  const [selectedChannel, setSelectedChannel] = useState<ContactChannel | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Carga de oportunidades desde la API REST
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/opportunities?isArchived=false");
      if (!res.ok) {
        throw new Error(`Error ${res.status}: Fallo al cargar oportunidades`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOpportunities(data.data);
      } else {
        throw new Error(data.error?.message || "Error al procesar respuesta");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error desconocido al conectar con el servidor";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialOpportunities !== undefined) {
      setOpportunities(initialOpportunities);
      setLoading(false);
    } else if (!initialLoading && !initialError) {
      fetchOpportunities();
    }
  }, [initialOpportunities, initialLoading, initialError, fetchOpportunities]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      fetchOpportunities();
    }
  };

  const handleCreateOpportunity = async (
    formData: CreateOpportunityFormData,
  ): Promise<boolean> => {
    setIsCreatingOpportunity(true);
    setOpportunityCreateError(null);
    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      type OpportunityResponse = {
        success?: boolean;
        data?: Opportunity;
        error?: { message?: string };
      };
      let result: OpportunityResponse | null = null;
      try {
        result = (await response.json()) as OpportunityResponse;
      } catch {
        // Las respuestas que no son JSON usan el fallback seguro.
      }

      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.error?.message || "No se pudo crear la oportunidad");
      }

      const createdOpportunity = result.data;
      setOpportunities((current) => [createdOpportunity, ...current]);
      setSelectedChannel("ALL");
      setSearchQuery("");
      setIsOpportunityFormOpen(false);
      return true;
    } catch (createError) {
      setOpportunityCreateError(
        createError instanceof Error
          ? createError.message
          : "No se pudo crear la oportunidad",
      );
      return false;
    } finally {
      setIsCreatingOpportunity(false);
    }
  };

  // Transición de etapa Kanban vía PATCH /api/opportunities/[id]
  const handleStageChange = async (
    opportunityId: string,
    toStage: PipelineStage,
  ) => {
    // Actualización optimista
    setOpportunities((prev) =>
      prev.map((opp) =>
        opp.id === opportunityId ? { ...opp, pipelineStage: toStage } : opp,
      ),
    );

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: toStage }),
      });
      if (!res.ok) {
        // Revertir si hay error
        fetchOpportunities();
      }
    } catch {
      fetchOpportunities();
    }
  };

  // Mutación de subestado vía PATCH /api/opportunities/[id]
  const handleUpdateSubstate = async (
    opportunityId: string,
    updates: {
      developmentStatus?: DevelopmentStatus;
      paymentStatus?: PaymentStatus;
    },
  ) => {
    // Actualización optimista
    setOpportunities((prev) =>
      prev.map((opp) =>
        opp.id === opportunityId ? { ...opp, ...updates } : opp,
      ),
    );

    try {
      await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch {
      fetchOpportunities();
    }
  };

  // Creación de nota append-only vía POST /api/notes
  const handleAddNote = async (opportunityId: string, content: string) => {
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          content,
        }),
      });
    } catch {
      // Sin bloqueo visual
    }
  };

  // Determinación de staleness usando las reglas de dominio puras
  const isOpportunityStale = (opp: Opportunity): boolean => {
    try {
      const updatedAtDate =
        typeof opp.updatedAt === "string" ? new Date(opp.updatedAt) : opp.updatedAt;
      return isStale(
        updatedAtDate,
        opp.pipelineStage,
        defaultStalenessThresholds(),
      );
    } catch {
      return false;
    }
  };

  // Filtrado de oportunidades por canal y búsqueda
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesChannel =
        selectedChannel === "ALL" || opp.contactChannel === selectedChannel;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        opp.clientName.toLowerCase().includes(q) ||
        opp.description.toLowerCase().includes(q);
      return matchesChannel && matchesSearch;
    });
  }, [opportunities, selectedChannel, searchQuery]);

  return (
    <div className="w-full min-h-screen bg-slate-50/50  p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Cabecera de la Página */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 ">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50  text-indigo-600 ">
            <KanbanIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900  tracking-tight">
              Pipeline Comercial
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 ">
              Gestión visual de oportunidades en 10 etapas con notas inmutables.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={isOpportunityFormOpen}
          aria-controls="opportunity-create-form"
          onClick={() => {
            setOpportunityCreateError(null);
            setIsOpportunityFormOpen((open) => !open);
          }}
          disabled={isCreatingOpportunity}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva oportunidad
        </button>
      </header>

      {isOpportunityFormOpen && (
        <OpportunityForm
          onSubmit={handleCreateOpportunity}
          onCancel={() => {
            setOpportunityCreateError(null);
            setIsOpportunityFormOpen(false);
          }}
          loading={isCreatingOpportunity}
          error={opportunityCreateError}
        />
      )}

      {/* ESTADO 1: CARGA (Loading) */}
      {loading && (
        <div
          data-testid="pipeline-loading"
          aria-busy="true"
          className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-200  bg-white  space-y-3"
        >
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-700 ">
            Cargando pipeline comercial...
          </p>
          <p className="text-xs text-slate-500">
            Sincronizando etapas y métricas de oportunidades
          </p>
        </div>
      )}

      {/* ESTADO 2: ERROR */}
      {!loading && error && (
        <div
          data-testid="pipeline-error"
          role="alert"
          className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl border border-rose-200  bg-rose-50/70  gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-rose-900 ">
                Ocurrió un error al cargar el pipeline
              </h3>
              <p className="text-xs text-rose-700 ">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* ESTADO 3: VACÍO (Empty) */}
      {!loading && !error && opportunities.length === 0 && (
        <div
          data-testid="pipeline-empty"
          className="flex flex-col items-center justify-center text-center p-12 sm:p-20 rounded-2xl border-2 border-dashed border-slate-200  bg-white  space-y-3"
        >
          <div className="p-3.5 rounded-full bg-slate-100  text-slate-500">
            <FolderPlus className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 ">
            No hay oportunidades registradas
          </h3>
          <p className="text-xs sm:text-sm text-slate-500  max-w-sm">
            Comienza creando una nueva oportunidad comercial para visualizarla y moverla en el tablero Kanban.
          </p>
        </div>
      )}

      {/* ESTADO 4: ÉXITO (Success con datos) */}
      {!loading && !error && opportunities.length > 0 && (
        <div className="space-y-4">
          {/* Filtros */}
          <KanbanFilters
            selectedChannel={selectedChannel}
            searchQuery={searchQuery}
            onChannelChange={setSelectedChannel}
            onSearchChange={setSearchQuery}
            onReset={() => {
              setSelectedChannel("ALL");
              setSearchQuery("");
            }}
            totalFiltered={filteredOpportunities.length}
            totalAll={opportunities.length}
          />

          {/* Tablero Kanban */}
          <KanbanBoard
            opportunities={filteredOpportunities}
            onStageChange={handleStageChange}
            onUpdateSubstate={handleUpdateSubstate}
            onAddNote={handleAddNote}
            isStaleFn={isOpportunityStale}
          />
        </div>
      )}
    </div>
  );
}

