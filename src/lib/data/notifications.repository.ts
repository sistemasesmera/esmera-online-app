import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AppRole, NotificationType } from "@/types/database.types";

type SendParams = {
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
};

export async function sendNotification(userId: string, params: SendParams): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").insert({
    user_id: userId,
    type: params.type,
    title: params.title,
    message: params.message,
    related_entity_type: params.related_entity_type ?? null,
    related_entity_id: params.related_entity_id ?? null,
  });
}

export async function sendNotificationsToRole(role: AppRole, params: SendParams): Promise<void> {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .eq("role", role)
    .eq("is_active", true);
  if (!users?.length) return;
  await supabase.from("notifications").insert(
    users.map((u) => ({
      user_id: u.id,
      type: params.type,
      title: params.title,
      message: params.message,
      related_entity_type: params.related_entity_type ?? null,
      related_entity_id: params.related_entity_id ?? null,
    }))
  );
}

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export async function getMyNotifications(): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as NotificationRow[];
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  return count ?? 0;
}
