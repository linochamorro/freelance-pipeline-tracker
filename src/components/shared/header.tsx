"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/kanban", label: "Pipeline" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/archive", label: "Archivo" },
  { href: "/settings", label: "Ajustes" },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-6">
        <a href="/kanban" className="text-sm font-semibold text-ink">
          Pipeline Tracker
        </a>
        <nav className="hidden sm:flex sm:gap-4" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  isActive
                    ? "font-medium text-accent"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        className="sm:hidden p-2 text-ink-secondary hover:text-ink"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <Button
        variant="ghost"
        size="sm"
        className="hidden sm:inline-flex"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Cerrar sesión
      </Button>

      {menuOpen && (
        <div className="absolute left-0 right-0 top-12 z-50 border-b border-border bg-surface p-4 shadow-sm sm:hidden">
          <nav className="flex flex-col gap-2" aria-label="Navegación móvil">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-surface-subtle font-medium text-accent"
                      : "text-ink-secondary hover:bg-surface-subtle hover:text-ink"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              );
            })}
            <hr className="my-2 border-border" />
            <button
              type="button"
              className="rounded-md px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface-subtle hover:text-ink"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
