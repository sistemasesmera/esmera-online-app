"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export type IAPromptRow = {
  id: string;
  key: string;
  name: string;
  prompt: string;
  is_active: boolean;
  updated_at: string | null;
};

export async function listIAPrompts(): Promise<IAPromptRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ia_interna_prompts")
    .select("id, key, name, prompt, is_active, updated_at")
    .order("name");
  return (data ?? []) as IAPromptRow[];
}

export async function getIAPrompt(key: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ia_interna_prompts")
    .select("prompt")
    .eq("key", key)
    .single();
  return data?.prompt ?? null;
}

export async function saveIAPrompt(
  key: string,
  prompt: string
): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "tech") {
    return { error: "No autorizado" };
  }
  if (!prompt.trim()) return { error: "El prompt no puede estar vacío" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ia_interna_prompts")
    .update({ prompt: prompt.trim(), updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("key", key);

  if (error) return { error: error.message };
  revalidatePath("/admin/ia-interna");
  return { error: null };
}
