"use server";

import { requireRole } from "@/lib/auth/require-role";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";

export async function summarizeLead(leadId: string): Promise<{ summary: string | null; error?: string }> {
  try {
    await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { summary: null, error: "No autorizado" };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { summary: null, error: "API key no configurada" };

  const supabase = await createClient();

  const [{ data: lead }, { data: interactions }, { data: promptRow }] = await Promise.all([
    supabase
      .from("leads")
      .select("full_name, status, source, interested_course, created_at, notes, discard_reason, discard_notes")
      .eq("id", leadId)
      .single(),
    supabase
      .from("lead_interactions")
      .select("contact_type, notes, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("ia_interna_prompts")
      .select("prompt")
      .eq("key", "lead_summary")
      .single(),
  ]);

  if (!lead) return { summary: null, error: "Lead no encontrado" };

  const now = Date.now();
  const MS_DAY = 1000 * 60 * 60 * 24;
  const daysInSystem = Math.floor((now - new Date(lead.created_at).getTime()) / MS_DAY);
  const lastContact = interactions?.[0];
  const daysSinceContact = lastContact
    ? Math.floor((now - new Date(lastContact.created_at).getTime()) / MS_DAY)
    : null;

  const leadData = {
    nombre: lead.full_name,
    estado: lead.status,
    origen: lead.source,
    curso_interes: lead.interested_course ?? "no especificado",
    dias_en_sistema: daysInSystem,
    dias_sin_contacto: daysSinceContact,
    notas_internas: lead.notes ?? null,
    motivo_descarte: lead.discard_reason ?? null,
    total_interacciones: interactions?.length ?? 0,
    historial: (interactions ?? []).map((i) => ({
      tipo: i.contact_type,
      fecha: i.created_at.slice(0, 10),
      nota: i.notes?.slice(0, 150) ?? "",
    })),
  };

  const systemPrompt = promptRow?.prompt ?? "Resume brevemente la situación del lead y da una recomendación de acción en 3 frases.";

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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(leadData) },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });
  } catch {
    return { summary: null, error: "Error de conexión con OpenAI" };
  }

  if (!response.ok) return { summary: null, error: `OpenAI respondió ${response.status}` };

  try {
    const json = await response.json();
    const summary = json.choices?.[0]?.message?.content?.trim() ?? null;
    return { summary };
  } catch {
    return { summary: null, error: "No se pudo interpretar la respuesta" };
  }
}
