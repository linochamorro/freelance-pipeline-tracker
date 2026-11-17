"use client";

import { useState, type FormEvent } from "react";
import type { ContactChannel } from "@/types";

export interface CreateOpportunityFormData {
  clientName: string;
  description: string;
  estimatedBudget: number;
  contactPersonName: string;
  contactChannel: ContactChannel;
}

interface OpportunityFormProps {
  onSubmit: (data: CreateOpportunityFormData) => Promise<boolean>;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

const CONTACT_CHANNELS: ReadonlyArray<{ value: ContactChannel; label: string }> = [
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "Email", label: "Email" },
  { value: "Referral", label: "Referido" },
  { value: "ColdOutreach", label: "Contacto en frío" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Phone", label: "Teléfono" },
  { value: "Other", label: "Otro" },
];

const INITIAL_FORM = {
  clientName: "",
  description: "",
  estimatedBudget: "",
  contactPersonName: "",
  contactChannel: "" as ContactChannel | "",
};

export function OpportunityForm({
  onSubmit,
  onCancel,
  loading,
  error,
}: OpportunityFormProps) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof typeof INITIAL_FORM, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const clientName = formData.clientName.trim();
    const description = formData.description.trim();
    const contactPersonName = formData.contactPersonName.trim();
    const budget = Number(formData.estimatedBudget);

    if (clientName.length < 2 || clientName.length > 200) {
      errors.clientName = "El cliente debe tener entre 2 y 200 caracteres";
    }
    if (description.length < 5 || description.length > 2000) {
      errors.description = "La descripción debe tener entre 5 y 2000 caracteres";
    }
    if (!formData.estimatedBudget || !Number.isFinite(budget) || budget < 0) {
      errors.estimatedBudget = "Ingresa un presupuesto igual o mayor a cero";
    }
    if (contactPersonName.length < 2 || contactPersonName.length > 200) {
      errors.contactPersonName = "El contacto debe tener entre 2 y 200 caracteres";
    }
    if (!formData.contactChannel) {
      errors.contactChannel = "Selecciona un canal de contacto";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !formData.contactChannel) return;

    const created = await onSubmit({
      clientName,
      description,
      estimatedBudget: budget,
      contactPersonName,
      contactChannel: formData.contactChannel,
    });

    if (created) {
      setFormData(INITIAL_FORM);
      setFieldErrors({});
    }
  };

  const inputClassName =
    "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";

  return (
    <form
      id="opportunity-create-form"
      aria-labelledby="opportunity-create-title"
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      noValidate
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="opportunity-create-title" className="text-lg font-semibold text-slate-900">
            Nueva oportunidad
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Se agregará al tablero en la etapa Lead.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="opportunity-client-name" className="block text-sm font-medium text-slate-700">
            Cliente
          </label>
          <input
            id="opportunity-client-name"
            name="clientName"
            autoComplete="organization"
            required
            minLength={2}
            maxLength={200}
            aria-describedby={fieldErrors.clientName ? "opportunity-client-error" : undefined}
            value={formData.clientName}
            onChange={(event) => handleChange("clientName", event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.clientName && (
            <p id="opportunity-client-error" role="alert" className="mt-1 text-xs text-rose-600">
              {fieldErrors.clientName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="opportunity-contact-name" className="block text-sm font-medium text-slate-700">
            Persona de contacto
          </label>
          <input
            id="opportunity-contact-name"
            name="contactPersonName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={200}
            aria-describedby={fieldErrors.contactPersonName ? "opportunity-contact-error" : undefined}
            value={formData.contactPersonName}
            onChange={(event) => handleChange("contactPersonName", event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.contactPersonName && (
            <p id="opportunity-contact-error" role="alert" className="mt-1 text-xs text-rose-600">
              {fieldErrors.contactPersonName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="opportunity-budget" className="block text-sm font-medium text-slate-700">
            Presupuesto estimado (S/.)
          </label>
          <input
            id="opportunity-budget"
            name="estimatedBudget"
            type="number"
            min="0"
            step="0.01"
            required
            inputMode="decimal"
            aria-describedby={fieldErrors.estimatedBudget ? "opportunity-budget-error" : undefined}
            value={formData.estimatedBudget}
            onChange={(event) => handleChange("estimatedBudget", event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.estimatedBudget && (
            <p id="opportunity-budget-error" role="alert" className="mt-1 text-xs text-rose-600">
              {fieldErrors.estimatedBudget}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="opportunity-contact-channel" className="block text-sm font-medium text-slate-700">
            Canal de contacto
          </label>
          <select
            id="opportunity-contact-channel"
            name="contactChannel"
            required
            aria-describedby={fieldErrors.contactChannel ? "opportunity-channel-error" : undefined}
            value={formData.contactChannel}
            onChange={(event) => handleChange("contactChannel", event.target.value)}
            className={inputClassName}
          >
            <option value="">Selecciona un canal</option>
            {CONTACT_CHANNELS.map((channel) => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </select>
          {fieldErrors.contactChannel && (
            <p id="opportunity-channel-error" role="alert" className="mt-1 text-xs text-rose-600">
              {fieldErrors.contactChannel}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="opportunity-description" className="block text-sm font-medium text-slate-700">
            Descripción
          </label>
          <textarea
            id="opportunity-description"
            name="description"
            rows={3}
            required
            minLength={5}
            maxLength={2000}
            aria-describedby={fieldErrors.description ? "opportunity-description-error" : undefined}
            value={formData.description}
            onChange={(event) => handleChange("description", event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.description && (
            <p id="opportunity-description-error" role="alert" className="mt-1 text-xs text-rose-600">
              {fieldErrors.description}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar oportunidad"}
        </button>
      </div>
    </form>
  );
}
