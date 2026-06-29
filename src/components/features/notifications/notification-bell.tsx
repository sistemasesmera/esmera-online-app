"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { markNotificationRead, markAllNotificationsRead } from "@/app/(app)/notifications/actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import type { NotificationRow } from "@/lib/data/notifications.repository";
import type { NotificationType } from "@/types/database.types";

const TYPE_LABELS: Record<NotificationType, string> = {
  nueva_venta: "Nueva venta",
  matricula_pendiente: "Matrícula pendiente",
  tutor_asignado: "Tutor asignado",
  alumno_inactivo: "Alumno inactivo",
  curso_finalizado: "Curso finalizado",
  certificado_pendiente: "Certificado pendiente",
};

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setNotifications((data ?? []) as NotificationRow[]));

    const channel = supabase
      .channel(`bell:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationRow, ...prev.slice(0, 9)]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === (payload.new as NotificationRow).id ? (payload.new as NotificationRow) : n))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    startTransition(async () => { await markNotificationRead(id); });
  }

  function handleMarkAll() {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    startTransition(async () => { await markAllNotificationsRead(); });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          )}
          <span className="sr-only">Notificaciones ({unreadCount} sin leer)</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-semibold text-sm">Notificaciones</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={isPending} onClick={handleMarkAll}>
              Marcar todas leídas
            </Button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin notificaciones</p>
          ) : (
            notifications.slice(0, 8).map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.is_read ? "bg-muted/30" : ""}`}
                onClick={() => { if (!n.is_read) handleMarkRead(n.id); }}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className={!n.is_read ? "" : "pl-3.5"}>
                    <p className="text-xs font-medium text-muted-foreground">
                      {TYPE_LABELS[n.type]}
                    </p>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t px-4 py-2">
          <Link
            href="/notifications"
            className="text-xs text-primary block text-center hover:underline"
            onClick={() => setOpen(false)}
          >
            Ver todas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
