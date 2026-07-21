"use server";

import { requireRole } from "@/lib/auth/require-role";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";

export type AISuggestion = {
  lead_id: string;
  lead_name: string;
  message: string;
  priority: "alta" | "media" | "baja";
  action_type: "llamada" | "whatsapp" | "email" | "seguimiento";
};

export type AnalyzeLeadsResult = {
  suggestions: AISuggestion[];
  error?: string;
};

export async function analyzeLeadsWithAI(): Promise<AnalyzeLeadsResult> {
  try {
    await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { suggestions: [], error: "No autorizado" };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { suggestions: [], error: "API key no configurada" };

  const supabase = await createClient();

  const { data: leads, error: dbError } = await supabase
    .from("leads")
    .select("id, full_name, status, created_at, interested_course, lead_interactions(contact_type, notes, created_at)")
    .neq("status", "convertido")
    .neq("status", "descartado")
    .order("created_at", { ascending: false })
    .limit(60);

  if (dbError) return { suggestions: [], error: dbError.message };
  if (!leads?.length) return { suggestions: [] };

  const now = Date.now();
  const MS_DAY = 1000 * 60 * 60 * 24;

  const leadsData = leads.map((lead) => {
    const interactions = (
      (lead.lead_interactions ?? []) as { contact_type: string; notes: string; created_at: string }[]
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const lastContact = interactions[0];
    const daysSinceCreated = Math.floor((now - new Date(lead.created_at).getTime()) / MS_DAY);
    const daysSinceContact = lastContact
      ? Math.floor((now - new Date(lastContact.created_at).getTime()) / MS_DAY)
      : null;

    return {
      id: lead.id,
      name: lead.full_name,
      status: lead.status,
      course: lead.interested_course ?? null,
      days_since_created: daysSinceCreated,
      days_since_last_contact: daysSinceContact,
      total_contacts: interactions.length,
      recent_contacts: interactions.slice(0, 3).map((i) => ({
        type: i.contact_type,
        date: i.created_at.slice(0, 10),
        notes: i.notes?.slice(0, 100) ?? "",
      })),
    };
  });

  /* Fetch editable prompt from DB */
  const { data: promptRow } = await supabase
    .from("ia_interna_prompts")
    .select("prompt")
    .eq("key", "lead_analysis")
    .single();

  const basePrompt = promptRow?.prompt ?? "Analiza los leads y devuelve sugerencias de seguimiento en JSON.";

  const prompt = `${basePrompt}

RESPONDE SOLO con este JSON exacto:
{"suggestions":[{"lead_id":"uuid","lead_name":"nombre completo","message":"acción concreta y motivadora en español, máx 85 caracteres, termina con exclamación","priority":"alta|media|baja","action_type":"llamada|whatsapp|email|seguimiento"}]}

DATOS:
${JSON.stringify(leadsData)}`;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 1200,
      }),
    });
  } catch {
    return { suggestions: [], error: "Error de conexión con OpenAI" };
  }

  if (!response.ok) {
    return { suggestions: [], error: `OpenAI respondió ${response.status}` };
  }

  try {
    const json = await response.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const suggestions: AISuggestion[] = (parsed.suggestions ?? []).slice(0, 8);
    return { suggestions };
  } catch {
    return { suggestions: [], error: "No se pudo interpretar la respuesta de IA" };
  }
}
