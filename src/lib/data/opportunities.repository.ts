import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type OpportunityRow = Database["public"]["Tables"]["opportunities"]["Row"];

export type OpportunityWithJoins = OpportunityRow & {
  leads: { full_name: string } | null;
  pipeline_stages: { name: string } | null;
  courses: { name: string } | null;
  users: { full_name: string } | null;
};

export async function listOpportunities(): Promise<OpportunityWithJoins[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "*, leads!lead_id(full_name), pipeline_stages!stage_id(name), courses!course_id(name), users!owner_id(full_name)"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OpportunityWithJoins[];
}
