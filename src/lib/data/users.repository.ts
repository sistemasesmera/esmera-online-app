import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function listUsers(): Promise<UserRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("users").select("*").order("full_name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("*").eq("id", id).single();
  return data;
}
