// src/components/tasks/notification-bell.tsx
// Campana de alertas con badge reactivo de notificaciones no leídas.
// La identidad la resuelve el servidor con la cookie de sesión (same-origin);
// el cliente nunca envía cabeceras de identidad.
// Accesible: aria-expanded, aria-controls, aria-live para el badge, navegación por teclado.

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Notification } from "@/types";
import { Bell, BellRing } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  readInApp: boolean;
  triggerAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.readInApp).length;

  // Cargar notificaciones al montar y al abrir la campana
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notifications`);
      const json = (await res.json()) as {
        success: boolean;
        data?: NotificationItem[];
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Error al cargar notificaciones");
      }
      setNotifications(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Escuchar evento de actualización desde otras partes de la app
  useEffect(() => {
    const handler = () => loadNotifications();
    window.addEventListener("refresh-notifications", handler);
    return () => window.removeEventListener("refresh-notifications", handler);
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { readInApp: boolean };
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Error al marcar como leída");
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readInApp: true } : n)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const toggle = () => {
    setOpen((prev) => {
      if (!prev) loadNotifications();
      return !prev;
    });
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-controls="notification-bell-popover"
        aria-describedby="notification-badge"
        data-action="toggle-notifications"
        className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-slate-600 hover:bg-slate-200 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors`}
        onClick={toggle}
      >
        {unreadCount > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        <span
          id="notification-badge"
          className={`absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm transition-all duration-200 ${
            unreadCount > 0
              ? "bg-rose-600 scale-100"
              : "hidden"
          }`}
          aria-live="polite"
          aria-label={`${unreadCount} notificación${unreadCount !== 1 ? "es" : ""} no leída${unreadCount !== 1 ? "s" : ""}`}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      </button>

      {open && (
        <div
          id="notification-bell-popover"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-bell-title"
          className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg p-0 z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h2 id="notification-bell-title" className="text-sm font-semibold text-slate-800">
              Notificaciones
            </h2>
            <button
              type="button"
              aria-label="Cerrar notificaciones"
              className="p-1.5 text-slate-500 hover:text-slate-600 rounded-lg hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading && (
            <div role="status" aria-label="Cargando notificaciones" className="flex items-center justify-center py-4 text-xs text-slate-500">
              Cargando…
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="px-4 py-4 text-xs text-slate-500 text-center">
              No hay notificaciones.
            </div>
          )}

          {!loading && notifications.length > 0 && (
            <ul role="list" className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <button
                    type="button"
                    aria-pressed={n.readInApp}
                    aria-label={`Marcar "${n.title}" como leída`}
                    data-notification-id={n.id}
                    data-action="mark-read"
                    className={`w-full flex justify-between items-start gap-2 rounded-lg p-2 transition-colors ${
                      n.readInApp
                        ? "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        : "bg-white text-slate-700 hover:bg-indigo-50"
                    }`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${n.readInApp ? "opacity-60" : "font-semibold"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs mt-0.5 truncate max-w-[220px] opacity-80">
                        {n.message}
                      </p>
                    </div>
                    {!n.readInApp && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div className="p-4 text-xs text-rose-600 bg-rose-50 border-t border-rose-200">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

