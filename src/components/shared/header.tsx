"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/kanban", label: "Pipeline" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/archive", label: "Archive" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-6">
        <a href="/kanban" className="text-sm font-semibold">
          Pipeline Tracker
        </a>
        <nav className="flex gap-4" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-sm ${
                pathname?.startsWith(item.href)
                  ? "font-medium text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign out
      </Button>
    </header>
  );
}
