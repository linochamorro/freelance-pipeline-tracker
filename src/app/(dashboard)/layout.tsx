// src/app/(dashboard)/layout.tsx
// Guard de sesión del grupo dashboard (F05-T01). Server component: resuelve
// la identidad EXCLUSIVAMENTE en servidor con getSessionUserId() (cookie
// `sessionToken` validada contra la tabla Session); si no hay sesión válida
// redirige a /login y nunca renderiza contenido protegido. Con sesión activa
// envuelve a las páginas (/, /pipeline, /archive, /tasks, /settings) en el
// shell global. No duplica layouts: el raíz (src/app/layout.tsx) ya provee
// <html>/<body> y este añade solo el shell.

import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUserId = await getSessionUserId();

  if (!sessionUserId) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
