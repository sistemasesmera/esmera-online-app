import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ContractEventRow = {
  id: string;
  event_type: string;
  occurred_at: string;
  email: string | null;
  decline_reason: string | null;
};

export async function getContractEvents(contractId: string): Promise<ContractEventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contract_events")
    .select("id, event_type, occurred_at, email, decline_reason")
    .eq("contract_id", contractId)
    .order("occurred_at", { ascending: true });
  return data ?? [];
}
