// src/components/dashboard/stale-deals-list.tsx
// Lista de deals inactivos (stale) con cliente, etapa, fecha de actualización
// y días de retraso. Accesible: tabla con cabeceras asociadas y estado vacío.

"use client";

import type { StaleDeal } from "@/services/dashboard-service";

// Nombres amigables de las 10 etapas canónicas en español
const STAGE_TITLES: Record<string, string> = {
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

interface StaleDealsListProps {
  staleDeals: StaleDeal[];
}

export function StaleDealsList({ staleDeals }: StaleDealsListProps) {
  return (
    <section aria-label="Listado de deals inactivos">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">
        Deals inactivos
      </h3>
      {staleDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-slate-500">
            No hay deals inactivos
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Todas las oportunidades están al día dentro de sus umbrales de inactividad.
          </p>
        </div>
      ) : (
        <table
          role="grid"
          aria-label="Deals inactivos (stale)"
          className="w-full rounded-lg border border-slate-200  bg-white  text-sm"
        >
          <thead>
            <tr className="border-b border-slate-200  bg-slate-50 ">
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-slate-500  text-left">
                Cliente
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-slate-500  text-left">
                Etapa
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-slate-500  text-left">
                Última actualización
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-slate-500  text-left">
                Días de retraso
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 ">
            {staleDeals.map((deal) => (
              <tr
                key={deal.id}
                className={`text-slate-800  ${
                  deal.daysOverdue > 0 ? "bg-rose-50 " : ""
                }`}
              >
                <td className="px-4 py-3 font-medium">{deal.clientName}</td>
                <td className="px-4 py-3">
                  {STAGE_TITLES[deal.pipelineStage] || deal.pipelineStage}
                </td>
                <td className="px-4 py-3 text-slate-500 ">
                  {new Date(deal.updatedAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {deal.daysOverdue} {deal.daysOverdue === 1 ? "día" : "días"} de retraso
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

