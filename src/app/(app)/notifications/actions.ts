"use server";

import { revalidatePath } from "next/cache";

import { APP_ROLES } from "@/lib/domain/shared/permissions";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

export async function markNotificationRead(id: string): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(APP_ROLES);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) return { error: error.message, success: false };
  revalidatePath("/notifications");
  return { error: null, success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(APP_ROLES);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", currentUser.id)
    .eq("is_read", false);

  if (error) return { error: error.message, success: false };
  revalidatePath("/notifications");
  return { error: null, success: true };
}
