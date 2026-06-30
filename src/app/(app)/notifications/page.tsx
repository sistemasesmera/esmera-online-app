import type { Metadata } from "next";
export const metadata: Metadata = { title: "Notificaciones" };

import { NotificationsClient } from "@/components/features/notifications/notifications-client";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getMyNotifications } from "@/lib/data/notifications.repository";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const [user, notifications] = await Promise.all([getCurrentUser(), getMyNotifications()]);
  if (!user) redirect("/login");

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-6">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        {unreadCount > 0 && (
          <span className="text-sm text-muted-foreground">({unreadCount} sin leer)</span>
        )}
      </div>
      <NotificationsClient initialNotifications={notifications} />
    </div>
  );
}
