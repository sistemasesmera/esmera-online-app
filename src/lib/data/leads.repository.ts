import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type LeadWithJoins = LeadRow & {
  users: { full_name: string } | null;
  meta_submission_count: number;
};

export async function listLeads(): Promise<LeadWithJoins[]> {
  const supabase = await createClient();
  const [{ data, error }, { data: metaRows }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, users!owner_id(full_name)")
      .neq("status", "convertido")
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_interactions")
      .select("lead_id")
      .filter("contact_type", "eq", "nota_interna"),
  ]);
  if (error) throw new Error(error.message);

  const countMap = new Map<string, number>();
  for (const row of metaRows ?? []) {
    countMap.set(row.lead_id, (countMap.get(row.lead_id) ?? 0) + 1);
  }

  return ((data ?? []) as unknown as LeadRow[]).map((lead) => ({
    ...(lead as LeadRow & { users: { full_name: string } | null }),
    meta_submission_count: countMap.get(lead.id) ?? 0,
  }));
}

export async function getLeadById(id: string): Promise<LeadRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select("*").eq("id", id).single();
  return data;
}

export async function getLeadWithJoins(id: string): Promise<LeadWithJoins | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*, users!owner_id(full_name)")
    .eq("id", id)
    .single();
  if (!data) return null;
  return { ...(data as unknown as LeadRow & { users: { full_name: string } | null }), meta_submission_count: 0 };
}
