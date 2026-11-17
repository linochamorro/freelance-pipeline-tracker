// tests/components/layout/dashboard-layout.test.tsx
// Pruebas unitarias del guard de sesión del grupo (dashboard) (F05-T01).
// El layout es un server component: se invoca como función asíncrona con
// dobles de getSessionUserId y redirect para verificar el contrato puro.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "@/app/(dashboard)/layout";
import { getSessionUserId } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSessionUserId: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// El shell real depende de next/navigation; se sustituye por un doble de
// render para aislar el contrato del guard.
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell-mock">{children}</div>
  ),
}));

import { redirect } from "next/navigation";

beforeEach(() => {
  vi.mocked(getSessionUserId).mockReset();
  vi.mocked(redirect).mockClear();
});

describe("(dashboard)/layout — guard de sesión", () => {
  it("redirige a /login cuando no hay sesión válida", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(null);

    await expect(
      DashboardLayout({ children: <p>privado</p> }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirige a /login cuando la sesión está caducada (null)", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(null);

    await expect(
      DashboardLayout({ children: <p>privado</p> }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("con sesión activa renderiza el shell envolviendo a los hijos", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("user-1");

    const tree = await DashboardLayout({ children: <p>contenido protegido</p> });
    render(<>{tree}</>);

    expect(screen.getByTestId("app-shell-mock")).toHaveTextContent(
      "contenido protegido",
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it("resuelve la sesión en servidor (sin props de identidad del cliente)", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("user-2");

    await DashboardLayout({ children: null });

    // El guard solo delega en getSessionUserId(): cero identidad desde cliente.
    expect(getSessionUserId).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });
});
