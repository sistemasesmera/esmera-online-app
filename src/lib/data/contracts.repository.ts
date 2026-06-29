import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ContractStatus, Database } from "@/types/database.types";

export type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];

export type ContractWithJoins = ContractRow & {
  students: { full_name: string; dni_nie: string } | null;
  opportunities: { id: string; leads: { full_name: string } | null } | null;
};

export async function listContracts(): Promise<ContractWithJoins[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "*, students!student_id(full_name, dni_nie), opportunities!opportunity_id(id, leads!lead_id(full_name))"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContractWithJoins[];
}

export { ContractStatus };
