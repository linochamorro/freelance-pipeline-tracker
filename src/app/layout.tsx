// src/app/layout.tsx
// Layout raíz obligatorio de la aplicación (F05-T01). Carga la hoja global de
// Tailwind 4, fija el idioma español y las clases base del sistema de diseño.
// Envuelve a todos los grupos de rutas ((dashboard) y (auth)) sin duplicar
// <html>/<body> en ningún otro nivel.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freelance Pipeline Tracker",
  description:
    "Gestiona tu pipeline comercial freelance: oportunidades, tareas, avisos y métricas de conversión en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 antialiased ">
        {children}
      </body>
    </html>
  );
}
