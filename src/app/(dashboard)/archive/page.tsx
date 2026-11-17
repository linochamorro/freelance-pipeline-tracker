// src/app/(dashboard)/archive/page.tsx
// Vista completa de oportunidades archivadas con listado de deals archivados,
// preservación de etapa original, restitución/desarchivo hacia /api/opportunities/[id]/archive,
// filtros reactivos por búsqueda, canales de ADR-004 y etapas, y los 4 estados canónicos.
// Enfoque visual: "Sharp, Calm, Dependable" (WCAG 2.2 AA).

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Archive,
  RotateCcw,
  Search,
  Filter,
  Banknote,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Linkedin,
  Mail,
  Users,
  Compass,
  MessageSquare,
  Phone,
  HelpCircle,
  X,
  Layers,
  Calendar,
} from "lucide-react";

import { CONTACT_CHANNELS } from "@/lib/rules/contact-channels";
import { PIPELINE_STAGES } from "@/lib/rules/stage-transitions";
// M-2 (F05-T01 loop 2/3): presentación PEN con el símbolo literal "S/.".
import { formatPEN } from "@/lib/format-currency";
import type { Opportunity, ContactChannel, PipelineStage } from "@/types";

export interface ArchivePageProps {
  initialOpportunities?: Opportunity[];
  initialLoading?: boolean;
  initialError?: string | null;
  onRetry?: () => void;
  onRestore?: (id: string) => Promise<void>;
}

// Nombres amigables de las 10 etapas canónicas en español
const STAGE_TITLES: Record<PipelineStage, string> = {
  Lead: "Lead",
  Contacted: "Contactado",
  MeetingScheduled: "Reunión agendada",
  BriefReceived: "Brief recibido",
  ProposalSent: "Propuesta enviada",
  Negotiation: "Negociación",
  Accepted: "Aceptado",
  InProgress: "En progreso",
  Completed: "Completado",
  Rejected: "Rechazado",
};

// Acentos cromáticos para los badges de etapa original
const STAGE_BADGE_STYLES: Record<PipelineStage, string> = {
  Lead: "bg-slate-100  text-slate-700  border-slate-300 ",
  Contacted: "bg-sky-50  text-sky-700  border-sky-200 ",
  MeetingScheduled: "bg-blue-50  text-blue-700  border-blue-200 ",
  BriefReceived: "bg-indigo-50  text-indigo-700  border-indigo-200 ",
  ProposalSent: "bg-purple-50  text-purple-700  border-purple-200 ",
  Negotiation: "bg-amber-50  text-amber-700  border-amber-200 ",
  Accepted: "bg-teal-50  text-teal-700  border-teal-200 ",
  InProgress: "bg-cyan-50  text-cyan-700  border-cyan-200 ",
  Completed: "bg-emerald-50  text-emerald-700  border-emerald-200 ",
  Rejected: "bg-rose-50  text-rose-700  border-rose-200 ",
};

// Metadatos de canales canónicos de ADR-004
const CHANNEL_META: Record<
  ContactChannel,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  LinkedIn: { label: "LinkedIn", icon: Linkedin },
  Email: { label: "Email", icon: Mail },
  Referral: { label: "Referido", icon: Users },
  ColdOutreach: { label: "Cold Outreach", icon: Compass },
  WhatsApp: { label: "WhatsApp", icon: MessageSquare },
  Phone: { label: "Teléfono", icon: Phone },
  Other: { label: "Otro", icon: HelpCircle },
};

// M-2 (F05-T01 loop 2/3): el presupuesto archivado usa el formateador
// compartido (PEN, símbolo literal "S/."). No hay conversión de divisas ni
// formateador local con otra moneda.

export default function ArchivePage({
  initialOpportunities,
  initialLoading = false,
  initialError = null,
  onRetry,
  onRestore,
}: ArchivePageProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(
    initialOpportunities || [],
  );
  const [loading, setLoading] = useState<boolean>(
    initialLoading ?? !initialOpportunities,
  );
  const [error, setError] = useState<string | null>(initialError);

  // Estados de Filtros
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<ContactChannel | "ALL">("ALL");
  const [selectedStage, setSelectedStage] = useState<PipelineStage | "ALL">("ALL");

  // Feedback de acción de restitución
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Carga remota de oportunidades archivadas
  const fetchArchivedOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/opportunities?isArchived=true");
      if (!res.ok) {
        throw new Error(`Error ${res.status}: Fallo al cargar oportunidades archivadas`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOpportunities(data.data);
      } else {
        throw new Error(data.error?.message || "Error al procesar respuesta del servidor");
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error desconocido al recuperar oportunidades archivadas";
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
      fetchArchivedOpportunities();
    }
  }, [initialOpportunities, initialLoading, initialError, fetchArchivedOpportunities]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      fetchArchivedOpportunities();
    }
  };

  // Restitución / Desarchivo de una oportunidad
  const handleRestore = async (opportunity: Opportunity) => {
    setRestoringId(opportunity.id);
    setActionSuccess(null);
    setActionError(null);

    try {
      if (onRestore) {
        await onRestore(opportunity.id);
      } else {
        const res = await fetch(`/api/opportunities/${opportunity.id}/archive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: false }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error?.message ||
              `Error ${res.status}: No se pudo restaurar la oportunidad`,
          );
        }
      }

      // Éxito: remover la oportunidad de la lista de archivadas
      setOpportunities((prev) => prev.filter((o) => o.id !== opportunity.id));
      const stageName =
        STAGE_TITLES[opportunity.pipelineStage] || opportunity.pipelineStage;
      setActionSuccess(
        `Oportunidad restaurada exitosamente a la etapa ${stageName}. Ya está disponible en el pipeline.`,
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error inesperado al intentar restaurar la oportunidad";
      setActionError(msg);
    } finally {
      setRestoringId(null);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedChannel("ALL");
    setSelectedStage("ALL");
  };

  const isFiltered =
    searchQuery.trim() !== "" || selectedChannel !== "ALL" || selectedStage !== "ALL";

  // Oportunidades filtradas por texto, canal y etapa original
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        opp.clientName.toLowerCase().includes(q) ||
        opp.description.toLowerCase().includes(q) ||
        (opp.contactPersonName && opp.contactPersonName.toLowerCase().includes(q));

      const matchesChannel =
        selectedChannel === "ALL" || opp.contactChannel === selectedChannel;

      const matchesStage =
        selectedStage === "ALL" || opp.pipelineStage === selectedStage;

      return matchesSearch && matchesChannel && matchesStage;
    });
  }, [opportunities, searchQuery, selectedChannel, selectedStage]);

  return (
    <div className="w-full min-h-screen bg-slate-50/50  p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Cabecera Principal */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 ">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-200  text-slate-700 ">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900  tracking-tight">
              Oportunidades Archivadas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 ">
              Historial de tratos pausados o descartados. Cada oportunidad conserva su etapa original para ser reactivada en cualquier momento.
            </p>
          </div>
        </div>
      </header>

      {/* ESTADO 1: CARGA (Loading) */}
      {loading && (
        <div
          data-testid="archive-loading"
          aria-busy="true"
          className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-200  bg-white  space-y-3"
        >
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-700 ">
            Cargando oportunidades archivadas...
          </p>
          <p className="text-xs text-slate-500">
            Recuperando deals y estados preservados
          </p>
        </div>
      )}

      {/* ESTADO 2: ERROR */}
      {!loading && error && (
        <div
          data-testid="archive-error"
          role="alert"
          className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl border border-rose-200  bg-rose-50/70  gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-rose-900 ">
                Ocurrió un error al cargar el archivo
              </h3>
              <p className="text-xs text-rose-700 ">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* ESTADO 3: VACÍO (Empty) */}
      {!loading && !error && opportunities.length === 0 && (
        <div
          data-testid="archive-empty"
          className="flex flex-col items-center justify-center text-center p-12 sm:p-20 rounded-2xl border-2 border-dashed border-slate-200  bg-white  space-y-3"
        >
          <div className="p-3.5 rounded-full bg-slate-100  text-slate-500">
            <Archive className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 ">
            No hay oportunidades archivadas
          </h3>
          <p className="text-xs sm:text-sm text-slate-500  max-w-md leading-relaxed">
            Los tratos archivados conservan su etapa original y pueden reactivarse en cualquier momento.
          </p>
        </div>
      )}

      {/* ESTADO 4: ÉXITO (Success con contenido) */}
      {!loading && !error && opportunities.length > 0 && (
        <div data-testid="archive-content" className="space-y-6">
          {/* Alerta de Feedback de Acción */}
          {actionSuccess && (
            <div
              role="status"
              className="flex items-center justify-between p-4 rounded-xl border border-emerald-200  bg-emerald-50/80  text-emerald-800  text-xs sm:text-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionSuccess(null)}
                aria-label="Cerrar aviso"
                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-100  cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="flex items-center justify-between p-4 rounded-xl border border-rose-200  bg-rose-50/80  text-rose-800  text-xs sm:text-sm"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                aria-label="Cerrar aviso de error"
                className="p-1 rounded-md text-rose-600 hover:bg-rose-100  cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Barra de Filtros */}
          <section
            aria-label="Filtros de búsqueda de archivo"
            className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-white  rounded-xl border border-slate-200  shadow-xs"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Búsqueda */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por cliente o descripción..."
                  aria-label="Buscar por cliente o descripción"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200  bg-slate-50/50  text-slate-800  placeholder:text-slate-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                />
              </div>

              {/* Filtro Canal */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <label htmlFor="channel-filter" className="sr-only">
                  Filtrar por canal
                </label>
                <select
                  id="channel-filter"
                  aria-label="Filtrar por canal"
                  value={selectedChannel}
                  onChange={(e) =>
                    setSelectedChannel(e.target.value as ContactChannel | "ALL")
                  }
                  className="text-xs py-2 px-2.5 rounded-lg border border-slate-200  bg-slate-50/50  text-slate-800  focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-pointer"
                >
                  <option value="ALL">Todos los canales</option>
                  {CONTACT_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Etapa Original */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <label htmlFor="stage-filter" className="sr-only">
                  Filtrar por etapa original
                </label>
                <select
                  id="stage-filter"
                  aria-label="Filtrar por etapa original"
                  value={selectedStage}
                  onChange={(e) =>
                    setSelectedStage(e.target.value as PipelineStage | "ALL")
                  }
                  className="text-xs py-2 px-2.5 rounded-lg border border-slate-200  bg-slate-50/50  text-slate-800  focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-pointer"
                >
                  <option value="ALL">Todas las etapas</option>
                  {PIPELINE_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {STAGE_TITLES[st] || st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contador y Reset */}
            <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100  shrink-0">
              <span className="text-xs text-slate-500 ">
                Mostrando <strong className="text-slate-800 ">{filteredOpportunities.length}</strong> de {opportunities.length}
              </span>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  aria-label="Limpiar filtros"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800  font-medium cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>
          </section>

          {/* Listado de Oportunidades Archivadas */}
          {filteredOpportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white  rounded-2xl border border-slate-200  text-center space-y-2">
              <Search className="w-6 h-6 text-slate-500" />
              <h4 className="text-sm font-semibold text-slate-800 ">
                Sin coincidencias para los filtros aplicados
              </h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Prueba ajustando los términos de búsqueda o los selectores de canal y etapa.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 text-xs text-indigo-600 hover:underline cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpportunities.map((opp) => {
                const ChannelIcon =
                  CHANNEL_META[opp.contactChannel]?.icon || HelpCircle;
                const channelLabel =
                  CHANNEL_META[opp.contactChannel]?.label || opp.contactChannel;
                const stageTitle =
                  STAGE_TITLES[opp.pipelineStage] || opp.pipelineStage;
                const stageStyle =
                  STAGE_BADGE_STYLES[opp.pipelineStage] ||
                  "bg-slate-100 text-slate-700 border-slate-200";
                const isRestoring = restoringId === opp.id;

                return (
                  <article
                    key={opp.id}
                    data-testid={`archived-deal-${opp.id}`}
                    className="flex flex-col justify-between rounded-xl bg-white  border border-slate-200  p-4 shadow-xs hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="space-y-3">
                      {/* Cabecera del Deal: Cliente y Etapa Original */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-900  truncate">
                            {opp.clientName}
                          </h3>
                          {opp.contactPersonName && (
                            <p className="text-xs text-slate-500  truncate">
                              {opp.contactPersonName}
                            </p>
                          )}
                        </div>

                        {/* Badge de Etapa Original Preservada */}
                        <span
                          data-testid="original-stage-badge"
                          title={`Etapa original del pipeline: ${stageTitle}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${stageStyle}`}
                        >
                          {stageTitle}
                        </span>
                      </div>

                      {/* Descripción */}
                      <p className="text-xs text-slate-600  line-clamp-3 leading-relaxed">
                        {opp.description}
                      </p>

                      {/* Presupuesto y Canal */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 ">
                        <div className="flex items-center font-bold text-slate-900 ">
                          <Banknote
                            className="w-3.5 h-3.5 text-emerald-600 mr-0.5"
                            aria-hidden="true"
                          />
                          <span>{formatPEN(opp.estimatedBudget)}</span>
                        </div>

                        <div
                          className="flex items-center gap-1 text-slate-500  text-[11px] bg-slate-50  px-2 py-0.5 rounded-md"
                          title={`Canal de contacto: ${channelLabel}`}
                        >
                          <ChannelIcon className="w-3.5 h-3.5 text-slate-600 " />
                          <span className="truncate max-w-[80px]">
                            {channelLabel}
                          </span>
                        </div>
                      </div>

                      {/* Subestados si aplican */}
                      {(opp.paymentStatus || opp.developmentStatus) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                          {opp.paymentStatus && (
                            <span className="font-medium text-emerald-700 bg-emerald-50   px-1.5 py-0.5 rounded-md">
                              Cobro: {opp.paymentStatus}
                            </span>
                          )}
                          {opp.developmentStatus && (
                            <span className="font-medium text-sky-700 bg-sky-50   px-1.5 py-0.5 rounded-md">
                              Dev: {opp.developmentStatus}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botón de Restitución / Desarchivo */}
                    <div className="pt-4 mt-3 border-t border-slate-100  flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleRestore(opp)}
                        disabled={isRestoring}
                        aria-label={`Restaurar deal ${opp.clientName}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700  bg-indigo-50  hover:bg-indigo-100  border border-indigo-200  transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      >
                        {isRestoring ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Restaurando...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar deal</span>
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

