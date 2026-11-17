// src/components/layout/app-shell.tsx
// Shell global de la aplicación (F05-T01): barra de navegación superior con
// marca, enlaces del contrato y página activa resaltada (aria-current),
// campana de avisos, cierre de sesión real y menú colapsable para móvil.
// Accesibilidad WCAG 2.2 AA: roles, aria-labels en español, foco visible
// (ring-2), enlace de salto al contenido, contraste AA y
// prefers-reduced-motion. Sistema de diseño: slate-50/950, indigo-600,
// semánticos emerald/amber/rose, iconos lucide-react.

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  Briefcase,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Settings,
  SquareKanban,
  X,
} from "lucide-react";
import { NotificationBell } from "@/components/tasks/notification-bell";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", Icon: SquareKanban },
  { href: "/archive", label: "Archive", Icon: Archive },
  { href: "/tasks", label: "Tasks", Icon: ListTodo },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

/** Resalta la página activa: "/" solo coincide exacto; el resto por prefijo. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Sesión caducada o cierre exitoso: llevar a /login y refrescar el árbol
  // de server components para que el guard de (dashboard) actúe.
  const redirectToLogin = useCallback(() => {
    router.push("/login");
    router.refresh();
  }, [router]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.status === 401) {
        // 401 en un fetch del shell: la sesión ya caducó → a /login.
        redirectToLogin();
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setLogoutError(
          json?.error?.message ||
            "No se pudo cerrar la sesión. Inténtalo de nuevo.",
        );
        return;
      }
      redirectToLogin();
    } catch {
      setLogoutError(
        "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      );
    } finally {
      setLoggingOut(false);
    }
  };

  // Escape cierra el menú móvil (navegación por teclado).
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const renderNavLinks = (onNavigate?: () => void) => (
    <ul className="flex flex-col gap-1 md:flex-row md:items-center md:gap-1">
      {NAV_LINKS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                active
                  ? "bg-indigo-50 text-indigo-700  "
                  : "text-slate-700 hover:bg-slate-100 hover:text-indigo-700   "
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen bg-slate-50 ">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur  ">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Pipeline Tracker — ir al inicio"
            className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-bold tracking-tight text-slate-900  sm:text-lg">
              Pipeline Tracker
            </span>
          </Link>

          <nav
            aria-label="Navegación principal"
            className="hidden md:block"
          >
            {renderNavLinks()}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBell />

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Cerrar sesión"
              aria-busy={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 transition-colors motion-reduce:transition-none hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60   "
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">
                {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
              </span>
              <span className="sm:hidden">
                {loggingOut ? "Cerrando…" : "Salir"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              aria-label={
                menuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"
              }
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors motion-reduce:transition-none hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2   md:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="menu-movil"
            aria-label="Navegación principal"
            className="border-t border-slate-200 bg-white px-4 pb-4 pt-2   md:hidden"
          >
            {renderNavLinks(() => setMenuOpen(false))}
          </nav>
        )}
      </header>

      {logoutError && (
        <div
          role="alert"
          className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 lg:px-8"
        >
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700   ">
            {logoutError}
          </p>
        </div>
      )}

      <main
        id="contenido-principal"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-0 sm:px-6 lg:px-8 focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}
