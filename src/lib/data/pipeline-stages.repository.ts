import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type PipelineStageRow = Database["public"]["Tables"]["pipeline_stages"]["Row"];

export async function listPipelineStages(): Promise<PipelineStageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("display_order");
  if (error) throw new Error(error.message);
  return data;
}
