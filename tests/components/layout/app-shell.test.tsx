// tests/components/layout/app-shell.test.tsx
// Pruebas de componente para el shell global (F05-T01).
// Cubre: enlaces del contrato, aria-current en página activa, campana de
// avisos, cierre de sesión (POST /api/auth/logout → /login), manejo de error
// y de 401 (sesión caducada), menú móvil y enlace de salto de contenido.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { AppShell } from "@/components/layout/app-shell";

// Router de Next simulado y controlable por prueba.
const nav = vi.hoisted(() => ({
  pathname: "/",
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push, replace: nav.push, refresh: nav.refresh }),
}));

// NotificationBell no requiere props; la identidad se resuelve en el servidor
// usando la cookie de sesión.
vi.mock("@/components/tasks/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell-mock" />,
}));

const fetchMock = vi.fn();

const okResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, data: null }),
});

beforeEach(() => {
  nav.pathname = "/";
  nav.push.mockReset();
  nav.refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppShell — navegación", () => {
  it("renderiza la marca y los cinco enlaces con los hrefs del contrato", () => {
    render(<AppShell>Contenido</AppShell>);

    const navEl = screen.getByRole("navigation", { name: /navegación principal/i });
    const expected = [
      { name: "Dashboard", href: "/" },
      { name: "Pipeline", href: "/pipeline" },
      { name: "Archive", href: "/archive" },
      { name: "Tasks", href: "/tasks" },
      { name: "Settings", href: "/settings" },
    ];
    for (const { name, href } of expected) {
      expect(within(navEl).getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.getByRole("link", { name: /pipeline tracker/i })).toBeInTheDocument();
  });

  it("resalta la página activa con aria-current y sin duplicados", () => {
    nav.pathname = "/pipeline";
    render(<AppShell>Contenido</AppShell>);

    const navEl = screen.getByRole("navigation", { name: /navegación principal/i });
    const active = within(navEl).getByRole("link", { name: "Pipeline" });
    expect(active).toHaveAttribute("aria-current", "page");

    const inactive = within(navEl).getByRole("link", { name: "Dashboard" });
    expect(inactive).not.toHaveAttribute("aria-current");
  });

  it("resalta Dashboard solo en la ruta exacta /", () => {
    nav.pathname = "/";
    render(<AppShell>Contenido</AppShell>);

    const navEl = screen.getByRole("navigation", { name: /navegación principal/i });
    expect(within(navEl).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(navEl).getByRole("link", { name: "Settings" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

describe("AppShell — campana de avisos y accesibilidad", () => {
  it("renderiza la campana de notificaciones en la cabecera", () => {
    render(<AppShell>Contenido</AppShell>);

    expect(screen.getByTestId("notification-bell-mock")).toBeInTheDocument();
  });

  it("ofrece un enlace para saltar al contenido principal", () => {
    render(<AppShell>Contenido</AppShell>);

    const skip = screen.getByRole("link", { name: /saltar al contenido/i });
    expect(skip).toHaveAttribute("href", "#contenido-principal");
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenido-principal");
  });

  it("despliega el menú móvil con aria-expanded y lo cierra con Escape", () => {
    render(<AppShell>Contenido</AppShell>);

    const toggle = screen.getByRole("button", { name: /abrir menú de navegación/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "menu-movil");

    fireEvent.click(toggle);
    const opened = screen.getByRole("button", { name: /cerrar menú de navegación/i });
    expect(opened).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(opened, { key: "Escape" });
    expect(
      screen.getByRole("button", { name: /abrir menú de navegación/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});

describe("AppShell — cierre de sesión", () => {
  it("llama POST /api/auth/logout y navega a /login", async () => {
    fetchMock.mockResolvedValue(okResponse());
    render(<AppShell>Contenido</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(nav.push).toHaveBeenCalledWith("/login");
    });
    expect(nav.refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/logout");
    expect(init.method).toBe("POST");
    // El cliente nunca envía identidad.
    expect(JSON.stringify(init.headers ?? {})).not.toContain("x-user-id");
  });

  it("muestra un error con role=alert si el cierre falla y no navega", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: { code: "SERVER_ERROR" } }),
    });
    render(<AppShell>Contenido</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("si un fetch del shell recibe 401 redirige a /login (sesión caducada)", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: "UNAUTHORIZED" } }),
    });
    render(<AppShell>Contenido</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(nav.push).toHaveBeenCalledWith("/login");
    });
    expect(nav.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
