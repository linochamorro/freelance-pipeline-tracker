// tests/components/tasks/notification-bell.test.ts
// Pruebas de componente para NotificationBell (RED → GREEN → REFACTOR)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { NotificationBell } from "@/components/tasks/notification-bell";

// F05-T01: la identidad la resuelve el servidor con la cookie de sesión;
// el componente ya no recibe userId por props ni envía cabeceras de identidad.

const mockNotifications = [
  {
    id: "notif_1",
    title: "Recordatorio: Tarea A",
    message: "La tarea vence pronto",
    readInApp: false,
    triggerAt: new Date().toISOString(),
  },
  {
    id: "notif_2",
    title: "Recordatorio: Tarea B",
    message: "Tarea completada",
    readInApp: true,
    triggerAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

function makeFetchResponse(data: any, status = 200) {
  return {
    ok: status === 200,
    status,
    json: async () => ({ success: status === 200, data, error: null }),
  };
}

describe("NotificationBell", () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.spyOn(globalThis, "fetch").mockImplementation(fetchSpy);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("renderiza la campana con badge oculto cuando no hay notificaciones no leídas", async () => {
    fetchSpy.mockResolvedValue(makeFetchResponse([]));
    act(() => {
      render(<NotificationBell />);
    });
    const bell = screen.getByRole("button", { name: /Notificaciones/ });
    expect(bell).toBeInTheDocument();
    await waitFor(() => {
      expect(document.getElementById("notification-badge")).toHaveClass(
        "hidden",
      );
    });
  });

  it("muestra badge con el conteo de notificaciones no leídas", async () => {
    fetchSpy.mockResolvedValue(makeFetchResponse(mockNotifications));
    act(() => {
      render(<NotificationBell />);
    });
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("abre el popover de notificaciones al hacer clic en la campana", async () => {
    fetchSpy.mockResolvedValue(makeFetchResponse(mockNotifications));
    act(() => {
      render(<NotificationBell />);
    });
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    const bell = screen.getByRole("button", { name: /Notificaciones/ });
    act(() => {
      fireEvent.click(bell);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Recordatorio: Tarea A")).toBeInTheDocument();
    });
  });

  it("marca notificación como leída y actualiza el badge", async () => {
    const markReadResponse = makeFetchResponse({ readInApp: true });
    fetchSpy.mockImplementation((url: string, opts?: any) => {
      if (String(url).includes("/read") && opts?.method === "PATCH") {
        return Promise.resolve(markReadResponse as unknown as Response);
      }
      return Promise.resolve(makeFetchResponse(mockNotifications) as unknown as Response);
    });

    act(() => {
      render(<NotificationBell />);
    });
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    const bell = screen.getByRole("button", { name: /Notificaciones/ });
    act(() => {
      fireEvent.click(bell);
    });

    await waitFor(() => {
      expect(screen.getByText("Recordatorio: Tarea A")).toBeInTheDocument();
    });

    const notifBtns = screen.getAllByRole("button", {
      name: /como leída/,
    });
    act(() => {
      fireEvent.click(notifBtns[0]);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/notifications/notif_1/read"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  it("no envía ninguna cabecera de identidad (x-user-id) al cargar notificaciones", async () => {
    fetchSpy.mockResolvedValue(makeFetchResponse(mockNotifications));
    act(() => {
      render(<NotificationBell />);
    });
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/notifications"),
      );
    });
    // Mismo origen con cookie de sesión: el fetch no lleva cabeceras de identidad.
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit | undefined];
    const serializedHeaders = JSON.stringify(init?.headers ?? {});
    expect(serializedHeaders).not.toContain("x-user-id");
  });
});
