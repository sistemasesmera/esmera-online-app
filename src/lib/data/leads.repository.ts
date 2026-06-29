import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type LeadWithJoins = LeadRow & {
  users: { full_name: string } | null;
};

export async function listLeads(): Promise<LeadWithJoins[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*, users!owner_id(full_name)")
    .neq("status", "convertido")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadWithJoins[];
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
  return data as unknown as LeadWithJoins | null;
}
