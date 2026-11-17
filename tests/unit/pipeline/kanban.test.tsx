// tests/unit/pipeline/kanban.test.tsx
// Pruebas unitarias de componentes UI del Tablero Kanban y Tarjeta 3D Flip
// Cumple con CA-03 (F02-T03): 10 columnas, DnD accesible, bloqueo terminales,
// giro 3D flip card, selectores condicionales, notas append-only, filtros y estados de página.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PIPELINE_STAGES } from "@/lib/rules/stage-transitions";
import type { Opportunity, ContactChannel } from "@/types";

// Importación de componentes a probar
import {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanFilters,
} from "@/components/kanban";
import PipelinePage from "@/app/(dashboard)/pipeline/page";

const mockOpportunities: Opportunity[] = [
  {
    id: "opp-1",
    userId: "user-1",
    clientName: "Acme Corp",
    description: "Desarrollo de API y migración Cloud",
    estimatedBudget: 5000,
    contactPersonName: "Alice Smith",
    contactChannel: "LinkedIn",
    pipelineStage: "Lead",
    paymentStatus: null,
    developmentStatus: null,
    isArchived: false,
    createdAt: new Date("2026-11-01T10:00:00Z"),
    updatedAt: new Date("2026-11-01T10:00:00Z"),
  },
  {
    id: "opp-2",
    userId: "user-1",
    clientName: "Beta Solutions",
    description: "Auditoría de ciberseguridad y pentesting",
    estimatedBudget: 3200,
    contactPersonName: "Bob Johnson",
    contactChannel: "Email",
    pipelineStage: "ProposalSent",
    paymentStatus: "Pending",
    developmentStatus: null,
    isArchived: false,
    createdAt: new Date("2026-11-05T12:00:00Z"),
    updatedAt: new Date("2026-11-05T12:00:00Z"),
  },
  {
    id: "opp-3",
    userId: "user-1",
    clientName: "Gamma Inc",
    description: "Frontend Next.js y Tailwind",
    estimatedBudget: 8500,
    contactPersonName: "Carol White",
    contactChannel: "Referral",
    pipelineStage: "Accepted",
    paymentStatus: null,
    developmentStatus: "InProgress",
    isArchived: false,
    createdAt: new Date("2026-11-07T08:00:00Z"),
    updatedAt: new Date("2026-11-07T08:00:00Z"),
  },
  {
    id: "opp-4",
    userId: "user-1",
    clientName: "Delta Terminal",
    description: "Proyecto finalizado con éxito",
    estimatedBudget: 12000,
    contactPersonName: "David Miller",
    contactChannel: "WhatsApp",
    pipelineStage: "Completed",
    paymentStatus: "Paid",
    developmentStatus: "Delivered",
    isArchived: false,
    createdAt: new Date("2026-10-15T09:00:00Z"),
    updatedAt: new Date("2026-10-15T09:00:00Z"),
  },
  {
    id: "opp-5",
    userId: "user-1",
    clientName: "Epsilon Tech",
    description: "Propuesta declinada por presupuesto",
    estimatedBudget: 2500,
    contactPersonName: "Eve Taylor",
    contactChannel: "ColdOutreach",
    pipelineStage: "Rejected",
    paymentStatus: null,
    developmentStatus: null,
    isArchived: false,
    createdAt: new Date("2026-10-20T11:00:00Z"),
    updatedAt: new Date("2026-10-20T11:00:00Z"),
  },
];

describe("1. Tablero Kanban (10 Columnas y Scroll Sincronizado)", () => {
  it("renderiza exactamente las 10 columnas en el orden lineal estricto de PIPELINE_STAGES", () => {
    render(<KanbanBoard opportunities={mockOpportunities} />);

    // Verificar las 10 columnas presentes por data-testid o role
    PIPELINE_STAGES.forEach((stage) => {
      const columnEl = screen.getByTestId(`kanban-column-${stage}`);
      expect(columnEl).toBeInTheDocument();
    });

    const columns = screen.getAllByTestId(/^kanban-column-/);
    expect(columns).toHaveLength(10);

    // Verificar orden
    columns.forEach((col, idx) => {
      expect(col).toHaveAttribute(
        "data-testid",
        `kanban-column-${PIPELINE_STAGES[idx]}`,
      );
    });
  });

  it("renderiza la barra de navegación o scroll horizontal sincronizada", () => {
    render(<KanbanBoard opportunities={mockOpportunities} />);
    const topScroll = screen.getByTestId("kanban-top-scroll");
    const boardScroll = screen.getByTestId("kanban-board-scroll");

    expect(topScroll).toBeInTheDocument();
    expect(boardScroll).toBeInTheDocument();
  });
});

describe("2. Columna Kanban (KanbanColumn)", () => {
  it("muestra el nombre de la etapa, badge con conteo y suma monetaria acumulada", () => {
    const oppsForProposal: Opportunity[] = [
      mockOpportunities[1], // 3200
      {
        ...mockOpportunities[1],
        id: "opp-2b",
        estimatedBudget: 1800,
      },
    ];

    render(
      <KanbanColumn
        stage="ProposalSent"
        opportunities={oppsForProposal}
        onStageChange={vi.fn()}
      />,
    );

    // Nombre y conteo
    expect(screen.getByText(/Propuesta enviada|ProposalSent/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Badge conteo

    // Suma monetaria acumulada: 3200 + 1800 = 5000 (PEN, símbolo literal "S/.")
    expect(screen.getByText("S/. 5,000.00")).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando una columna no tiene tarjetas", () => {
    render(
      <KanbanColumn
        stage="MeetingScheduled"
        opportunities={[]}
        onStageChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Sin oportunidades/i)).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("S/. 0.00")).toBeInTheDocument();
  });
});

describe("3. Tarjeta Kanban con 3D Flip (KanbanCard)", () => {
  it("muestra en el frente cliente, descripción, presupuesto formateado y canal de contacto", () => {
    render(<KanbanCard opportunity={mockOpportunities[0]} />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(
      screen.getByText("Desarrollo de API y migración Cloud"),
    ).toBeInTheDocument();
    expect(screen.getByText("S/. 5,000.00")).toBeInTheDocument();
    expect(screen.getByText(/LinkedIn/i)).toBeInTheDocument();
  });

  it("muestra alerta de staleness cuando la oportunidad está marcada como inactiva", () => {
    render(
      <KanbanCard opportunity={mockOpportunities[0]} isStaleAlert={true} />,
    );
    expect(screen.getByTestId("stale-indicator")).toBeInTheDocument();
    expect(screen.getByText(/Inactiva|Stale/i)).toBeInTheDocument();
  });

  it("gira 3D al hacer click en el botón de girar y regresa al frente", async () => {
    const user = userEvent.setup();
    render(<KanbanCard opportunity={mockOpportunities[0]} />);

    const card = screen.getByTestId(`kanban-card-${mockOpportunities[0].id}`);
    expect(card).toHaveAttribute("data-flipped", "false");

    // Botón de giro en frente
    const flipBtn = screen.getByRole("button", {
      name: /Girar tarjeta|Ver detalles|Flip/i,
    });
    await user.click(flipBtn);

    expect(card).toHaveAttribute("data-flipped", "true");

    // Botón de volver en dorso
    const backBtn = screen.getByRole("button", {
      name: /Volver|Regresar|Frente/i,
    });
    await user.click(backBtn);

    expect(card).toHaveAttribute("data-flipped", "false");
  });

  it("mantiene ambas caras apiladas y orientadas para que el dorso no se refleje", async () => {
    const user = userEvent.setup();
    render(<KanbanCard opportunity={mockOpportunities[0]} />);

    const front = screen.getByTestId("kanban-card-front");
    const back = screen.getByTestId("kanban-card-back");

    expect(front).toHaveStyle({ transform: "rotateY(0deg)" });
    expect(back).toHaveStyle({ transform: "rotateY(180deg)" });
    expect(front).toHaveStyle({ backfaceVisibility: "hidden" });
    expect(back).toHaveStyle({ backfaceVisibility: "hidden" });
    expect(front).toHaveStyle({ gridArea: "1 / 1" });
    expect(back).toHaveStyle({ gridArea: "1 / 1" });

    await user.click(
      screen.getByRole("button", { name: /Girar tarjeta para ver detalles/i }),
    );
    const card = screen.getByTestId(`kanban-card-${mockOpportunities[0].id}`);
    const flipSurface = card.querySelector("[data-testid='kanban-card-flip-surface']");
    expect(flipSurface).toHaveStyle({ transform: "rotateY(180deg)" });
  });

  it("bloquea el arrastre en etapas terminales (Completed y Rejected)", () => {
    // Completed
    const { rerender } = render(
      <KanbanCard opportunity={mockOpportunities[3]} />,
    );
    const completedCard = screen.getByTestId(`kanban-card-${mockOpportunities[3].id}`);
    expect(completedCard).toHaveAttribute("data-draggable", "false");
    expect(screen.getByTestId("terminal-badge")).toBeInTheDocument();

    // Rejected
    rerender(<KanbanCard opportunity={mockOpportunities[4]} />);
    const rejectedCard = screen.getByTestId(`kanban-card-${mockOpportunities[4].id}`);
    expect(rejectedCard).toHaveAttribute("data-draggable", "false");
  });

  it("permite arrastre en etapas no terminales", () => {
    render(<KanbanCard opportunity={mockOpportunities[0]} />);
    const activeCard = screen.getByTestId(`kanban-card-${mockOpportunities[0].id}`);
    expect(activeCard).toHaveAttribute("data-draggable", "true");
  });

  it("en el dorso, habilita developmentStatus solo si la etapa es Accepted", async () => {
    const user = userEvent.setup();
    const onUpdateSubstate = vi.fn();

    // Caso 1: Etapa 'Accepted' -> selector habilitado
    const { rerender } = render(
      <KanbanCard
        opportunity={mockOpportunities[2]} // Accepted
        onUpdateSubstate={onUpdateSubstate}
      />,
    );

    // Girar al dorso
    await user.click(
      screen.getByRole("button", { name: /Girar tarjeta|Ver detalles|Flip/i }),
    );

    const devSelect = screen.getByLabelText(/Estado de desarrollo/i);
    expect(devSelect).toBeEnabled();

    fireEvent.change(devSelect, { target: { value: "Delivered" } });
    expect(onUpdateSubstate).toHaveBeenCalledWith("opp-3", {
      developmentStatus: "Delivered",
    });

    // Caso 2: Etapa 'Lead' -> selector deshabilitado
    rerender(
      <KanbanCard
        opportunity={mockOpportunities[0]} // Lead
        onUpdateSubstate={onUpdateSubstate}
      />,
    );

    const devSelectLead = screen.getByLabelText(/Estado de desarrollo/i);
    expect(devSelectLead).toBeDisabled();
  });

  it("en el dorso, habilita paymentStatus solo si la etapa es ProposalSent", async () => {
    const user = userEvent.setup();
    const onUpdateSubstate = vi.fn();

    // Caso 1: Etapa 'ProposalSent' -> selector habilitado
    const { rerender } = render(
      <KanbanCard
        opportunity={mockOpportunities[1]} // ProposalSent
        onUpdateSubstate={onUpdateSubstate}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Girar tarjeta|Ver detalles|Flip/i }),
    );

    const paySelect = screen.getByLabelText(/Estado de cobro|pago/i);
    expect(paySelect).toBeEnabled();

    fireEvent.change(paySelect, { target: { value: "Paid" } });
    expect(onUpdateSubstate).toHaveBeenCalledWith("opp-2", {
      paymentStatus: "Paid",
    });

    // Caso 2: Etapa 'Lead' -> selector deshabilitado
    rerender(
      <KanbanCard
        opportunity={mockOpportunities[0]} // Lead
        onUpdateSubstate={onUpdateSubstate}
      />,
    );

    const paySelectLead = screen.getByLabelText(/Estado de cobro|pago/i);
    expect(paySelectLead).toBeDisabled();
  });

  it("en el dorso, permite agregar nota rápida append-only y limpia el campo", async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn();

    render(
      <KanbanCard
        opportunity={mockOpportunities[0]}
        onAddNote={onAddNote}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Girar tarjeta|Ver detalles|Flip/i }),
    );

    const noteInput = screen.getByPlaceholderText(/Escribe una nota rápida/i);
    await user.type(noteInput, "Llamada de seguimiento agendada para el lunes");

    const submitBtn = screen.getByRole("button", { name: /Guardar nota|Agregar nota/i });
    await user.click(submitBtn);

    expect(onAddNote).toHaveBeenCalledWith(
      "opp-1",
      "Llamada de seguimiento agendada para el lunes",
    );
    expect(noteInput).toHaveValue("");
  });

  it("respeta prefers-reduced-motion y aplica la clase accesible", () => {
    // Simular matchMedia para prefers-reduced-motion
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("prefers-reduced-motion: reduce"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<KanbanCard opportunity={mockOpportunities[0]} />);
    const card = screen.getByTestId(`kanban-card-${mockOpportunities[0].id}`);
    expect(card.className).toMatch(/motion-reduce/);
    const front = screen.getByTestId("kanban-card-front");
    const back = screen.getByTestId("kanban-card-back");
    expect(front).toHaveStyle({ transform: "none" });
    expect(back).toHaveStyle({ transform: "none" });
    expect(back).toHaveClass("hidden");

    fireEvent.click(
      screen.getByRole("button", { name: /Girar tarjeta para ver detalles/i }),
    );
    expect(front).toHaveClass("hidden");
    expect(back).not.toHaveClass("hidden");
  });
});

describe("4. Filtros Kanban (KanbanFilters)", () => {
  it("muestra selector de canales con los 7 canales canónicos de ADR-004", () => {
    render(
      <KanbanFilters
        selectedChannel="ALL"
        searchQuery=""
        onChannelChange={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );

    const channelSelect = screen.getByLabelText(/Filtrar por canal/i);
    expect(channelSelect).toBeInTheDocument();

    const expectedChannels: ContactChannel[] = [
      "LinkedIn",
      "Email",
      "Referral",
      "ColdOutreach",
      "WhatsApp",
      "Phone",
      "Other",
    ];

    expectedChannels.forEach((channel) => {
      expect(
        within(channelSelect).getByRole("option", { name: new RegExp(channel, "i") }),
      ).toBeInTheDocument();
    });
  });

  it("notifica al cambiar filtro de canal y búsqueda", async () => {
    const onChannelChange = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <KanbanFilters
        selectedChannel="ALL"
        searchQuery=""
        onChannelChange={onChannelChange}
        onSearchChange={onSearchChange}
      />,
    );

    const channelSelect = screen.getByLabelText(/Filtrar por canal/i);
    fireEvent.change(channelSelect, { target: { value: "LinkedIn" } });
    expect(onChannelChange).toHaveBeenCalledWith("LinkedIn");

    const searchInput = screen.getByPlaceholderText(/Buscar por cliente o descripción/i);
    fireEvent.change(searchInput, { target: { value: "Acme" } });
    expect(onSearchChange).toHaveBeenCalledWith("Acme");
  });
});

describe("5. Página /pipeline (PipelinePage)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra estado de carga mientras recupera oportunidades", () => {
    render(<PipelinePage initialLoading={true} />);
    expect(screen.getByTestId("pipeline-loading")).toBeInTheDocument();
    expect(screen.getByText(/Cargando pipeline/i)).toBeInTheDocument();
  });

  it("muestra estado de error con opción de reintentar", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <PipelinePage
        initialError="Error al conectar con el servidor"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId("pipeline-error")).toBeInTheDocument();
    expect(
      screen.getByText(/Error al conectar con el servidor/i),
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Reintentar/i });
    await user.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });

  it("muestra estado vacío cuando no hay oportunidades registradas", () => {
    render(<PipelinePage initialOpportunities={[]} />);
    expect(screen.getByTestId("pipeline-empty")).toBeInTheDocument();
    expect(screen.getByText(/No hay oportunidades registradas/i)).toBeInTheDocument();
  });

  it("renderiza el tablero Kanban y filtros cuando hay datos", () => {
    render(<PipelinePage initialOpportunities={mockOpportunities} />);
    expect(screen.getByTestId("kanban-top-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-board-scroll")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("filtra oportunidades en el tablero según el canal seleccionado y búsqueda de texto", async () => {
    const user = userEvent.setup();
    render(<PipelinePage initialOpportunities={mockOpportunities} />);

    // Buscar "Beta"
    const searchInput = screen.getByPlaceholderText(/Buscar por cliente o descripción/i);
    await user.type(searchInput, "Beta");

    expect(screen.getByText("Beta Solutions")).toBeInTheDocument();
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("permite crear una oportunidad desde el pipeline y la muestra en Lead", async () => {
    const user = userEvent.setup();
    const createdOpportunity: Opportunity = {
      ...mockOpportunities[0],
      id: "opp-created",
      clientName: "QA Opportunity",
      description: "Oportunidad de prueba de aceptación",
      estimatedBudget: 100,
      contactPersonName: "QA Contact",
      contactChannel: "Referral",
      pipelineStage: "Lead",
      paymentStatus: null,
      developmentStatus: null,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, data: createdOpportunity }),
    } as Response);

    render(<PipelinePage initialOpportunities={[]} />);
    await user.click(screen.getByRole("button", { name: /Nueva oportunidad/i }));
    await user.type(screen.getByLabelText(/Cliente/i), "QA Opportunity");
    await user.type(
      screen.getByLabelText(/Descripción/i),
      "Oportunidad de prueba de aceptación",
    );
    await user.type(screen.getByLabelText(/Presupuesto estimado/i), "100");
    await user.type(screen.getByLabelText(/Persona de contacto/i), "QA Contact");
    await user.selectOptions(screen.getByLabelText(/Canal de contacto/i), "Referral");
    await user.click(screen.getByRole("button", { name: /Guardar oportunidad/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/opportunities",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({
      clientName: "QA Opportunity",
      description: "Oportunidad de prueba de aceptación",
      estimatedBudget: 100,
      contactPersonName: "QA Contact",
      contactChannel: "Referral",
    });
    expect(await screen.findByText("QA Opportunity")).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: /Nueva oportunidad/i }),
    ).not.toBeInTheDocument();
  });

  it("conserva los datos y muestra el mensaje API si falla la creación", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Datos de oportunidad inválidos" },
      }),
    } as Response);

    render(<PipelinePage initialOpportunities={[]} />);
    await user.click(screen.getByRole("button", { name: /Nueva oportunidad/i }));
    await user.type(screen.getByLabelText(/Cliente/i), "QA Error Case");
    await user.type(
      screen.getByLabelText(/Descripción/i),
      "Conservar datos tras error",
    );
    await user.type(screen.getByLabelText(/Presupuesto estimado/i), "75");
    await user.type(screen.getByLabelText(/Persona de contacto/i), "QA Contact");
    await user.selectOptions(screen.getByLabelText(/Canal de contacto/i), "Email");
    await user.click(screen.getByRole("button", { name: /Guardar oportunidad/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Datos de oportunidad inválidos",
    );
    expect(screen.getByLabelText(/Cliente/i)).toHaveValue("QA Error Case");
    expect(screen.getByLabelText(/Descripción/i)).toHaveValue(
      "Conservar datos tras error",
    );
    expect(screen.getByLabelText(/Presupuesto estimado/i)).toHaveValue(75);
    expect(screen.getByLabelText(/Persona de contacto/i)).toHaveValue("QA Contact");
    expect(screen.getByLabelText(/Canal de contacto/i)).toHaveValue("Email");
  });

  it("cancela el formulario sin enviar la oportunidad", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<PipelinePage initialOpportunities={[]} />);
    await user.click(screen.getByRole("button", { name: /Nueva oportunidad/i }));
    await user.type(screen.getByLabelText(/Cliente/i), "No enviar");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/Persona de contacto/i)).not.toBeInTheDocument();
  });
});
