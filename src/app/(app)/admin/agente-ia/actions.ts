"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type AgentConfig = {
  id: string;
  is_active: boolean;
  model: string;
  welcome_message: string;
  system_prompt: string;
  knowledge: string;
  updated_at: string | null;
};

export type AgentConversation = {
  id: string;
  session_id: string;
  messages: { role: string; content: string }[];
  lead_id: string | null;
  lead_captured_at: string | null;
  visitor_name: string | null;
  visitor_phone: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getAgentConversations(): Promise<AgentConversation[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as unknown as AgentConversation[]);
}

export async function getAgentConfig(): Promise<AgentConfig | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("agent_config").select("*").single();
  return data ?? null;
}

export async function saveAgentConfig(input: {
  is_active: boolean;
  model: string;
  welcome_message: string;
  system_prompt: string;
  knowledge: string;
}): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "tech") redirect("/dashboard");

  const supabase = createAdminClient();

  // Singleton row — fetch id then update by id
  const { data: existing } = await supabase.from("agent_config").select("id").single();
  if (!existing) return { error: "Configuración no encontrada" };

  const { error } = await supabase
    .from("agent_config")
    .update({ ...input, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", existing.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/agente-ia");
  return { error: null };
}
