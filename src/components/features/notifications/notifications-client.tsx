"use client";

import { CheckCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { markNotificationRead, markAllNotificationsRead } from "@/app/(app)/notifications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function NotificationsClient({ initialNotifications }: { initialNotifications: NotificationRow[] }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.error) toast.error(result.error);
    });
  }

  function handleMarkAll() {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.error) toast.error(result.error);
      else toast.success("Todas las notificaciones marcadas como leídas");
    });
  }

  return (
    <>
      {unreadCount > 0 && (
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" disabled={isPending} onClick={handleMarkAll}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como leídas ({unreadCount})
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tienes notificaciones
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-colors ${!n.is_read ? "border-primary/30 bg-muted/20" : ""}`}
            >
              <CardContent className="py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className={!n.is_read ? "" : "pl-5"}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[n.type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                </div>
                {!n.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs h-7"
                    disabled={isPending}
                    onClick={() => handleMarkRead(n.id)}
                  >
                    Marcar leída
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
