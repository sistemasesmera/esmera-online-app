import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type LeadInteractionRow = Database["public"]["Tables"]["lead_interactions"]["Row"] & {
  users: { full_name: string } | null;
};

export async function listLeadInteractions(leadId: string): Promise<LeadInteractionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_interactions")
    .select("*, users!user_id(full_name)")
    .eq("lead_id", leadId)
    .order("followup_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadInteractionRow[];
}
