import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TasksPage from "@/app/(dashboard)/tasks/page";

vi.mock("@/components/tasks/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

const mockFetch = vi.fn();
const baseTask = {
  id: "task-created",
  userId: "user-test",
  opportunityId: null,
  title: "Preparar entrega",
  description: "",
  dueDate: "2026-12-01T18:00:00.000Z",
  completed: false,
  leadMinutes: 15,
  createdAt: "2026-11-15T18:00:00.000Z",
  updatedAt: "2026-11-15T18:00:00.000Z",
  notifications: [],
};

function localDateTimeAfter(hours: number): string {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function apiResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  mockFetch.mockResolvedValueOnce(apiResponse({ success: true, data: [] }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/tasks create flow", () => {
  it("sends datetime-local as an ISO instant representing the browser-local time and renders the created task", async () => {
    const localDueDate = localDateTimeAfter(24);
    const expectedIso = new Date(localDueDate).toISOString();
    mockFetch.mockResolvedValueOnce(apiResponse({ success: true, data: { ...baseTask, dueDate: expectedIso } }, 201));

    render(<TasksPage />);
    fireEvent.change(screen.getByLabelText(/Título de la tarea/), { target: { value: "Preparar entrega" } });
    fireEvent.change(screen.getByLabelText(/Fecha límite/), { target: { value: localDueDate } });
    fireEvent.change(screen.getByLabelText(/Adelanto de notificación/), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear tarea" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    const [url, request] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("/api/tasks");
    expect(JSON.parse(String(request.body))).toMatchObject({
      dueDate: expectedIso,
      leadMinutes: 15,
    });
    expect(await screen.findByText("Preparar entrega")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Título de la tarea/)).toHaveValue("");
    expect(screen.getByLabelText(/Descripción/)).toHaveValue("");
    expect(screen.getByLabelText(/Fecha límite/, { selector: "input" })).toHaveValue("");
    expect(screen.getByLabelText(/Adelanto de notificación/)).toHaveValue("15");
  });

  it("shows the safe API validation message instead of masking it with a generic error", async () => {
    const enteredDateTime = localDateTimeAfter(24);
    mockFetch.mockResolvedValueOnce(apiResponse({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Datos de tarea inválidos" },
    }, 400));

    render(<TasksPage />);
    fireEvent.change(screen.getByLabelText(/Título de la tarea/), { target: { value: "Preparar entrega" } });
    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: "Conservar si falla" } });
    fireEvent.change(screen.getByLabelText(/Fecha límite/), { target: { value: enteredDateTime } });
    fireEvent.change(screen.getByLabelText(/Adelanto de notificación/), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear tarea" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Datos de tarea inválidos");
    expect(screen.queryByText("Error al crear tarea")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Título de la tarea/)).toHaveValue("Preparar entrega");
    expect(screen.getByLabelText(/Descripción/)).toHaveValue("Conservar si falla");
    expect(screen.getByLabelText(/Fecha límite/, { selector: "input" })).toHaveValue(enteredDateTime);
    expect(screen.getByLabelText(/Adelanto de notificación/)).toHaveValue("30");
  });
});
