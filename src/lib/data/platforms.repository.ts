import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type PlatformRow = Database["public"]["Tables"]["platforms"]["Row"];

export async function listPlatforms(): Promise<PlatformRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("platforms").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}
