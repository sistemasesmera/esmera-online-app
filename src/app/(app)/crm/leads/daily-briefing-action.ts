"use server";

import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const DEFAULT_PROMPT = `Eres un asistente de ventas experto para Esmera Online, una academia de formación online. Genera un briefing diario personalizado para el comercial. Analiza sus leads y explica qué debe priorizar HOY: leads sin contactar, seguimientos pendientes, ofertas enviadas sin respuesta. Sé directo, motivador y concreto. Menciona nombres de leads. Máximo 250 palabras.`;

export type DailyBriefingResult = {
  content: string | null;
  isNew: boolean;
  error?: string;
};

export async function getDailyBriefing(): Promise<DailyBriefingResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { content: null, isNew: false, error: "No autorizado" };
  }

  if (!["comercial", "jefe_comercial"].includes(currentUser.role)) {
    return { content: null, isNew: false };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("daily_briefings")
    .select("content")
    .eq("user_id", currentUser.id)
    .eq("briefing_date", today)
    .single();

  if (existing?.content) {
    return { content: existing.content, isNew: false };
  }

  return generateAndStore(currentUser, supabase, today);
}

export async function regenerateDailyBriefing(): Promise<DailyBriefingResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { content: null, isNew: false, error: "No autorizado" };
  }

  if (!["comercial", "jefe_comercial"].includes(currentUser.role)) {
    return { content: null, isNew: false };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  await supabase
    .from("daily_briefings")
    .delete()
    .eq("user_id", currentUser.id)
    .eq("briefing_date", today);

  return generateAndStore(currentUser, supabase, today);
}

async function generateAndStore(
  currentUser: { id: string; fullName: string; role: string },
  supabase: Awaited<ReturnType<typeof createClient>>,
  today: string
): Promise<DailyBriefingResult> {
  if (!OPENAI_API_KEY) {
    return { content: null, isNew: false, error: "OpenAI no configurado" };
  }

  const isJefe = currentUser.role === "jefe_comercial";

  // Fetch leads (own for comercial, all active for jefe)
  const leadsQuery = supabase
    .from("leads")
    .select("id, full_name, status, interested_course, created_at, discard_reason, lead_interactions(contact_type, created_at, next_followup_date)")
    .in("status", ["nuevo", "en_contacto", "oferta_enviada"]);

  if (!isJefe) leadsQuery.eq("owner_id", currentUser.id);

  const { data: leads } = await leadsQuery.limit(50);

  if (!leads || leads.length === 0) {
    const msg = isJefe
      ? "No hay leads activos hoy en el equipo. ¡Buen momento para revisar estrategias!"
      : `¡Buenos días, ${currentUser.fullName.split(" ")[0]}! No tienes leads activos asignados hoy. Aprovecha para prospección o revisa leads descartados.`;

    await supabase.from("daily_briefings").insert({
      user_id: currentUser.id,
      briefing_date: today,
      content: msg,
    });

    return { content: msg, isNew: true };
  }

  // Fetch prompt from DB
  const { data: promptRow } = await supabase
    .from("ia_interna_prompts")
    .select("prompt")
    .eq("key", "daily_briefing")
    .eq("is_active", true)
    .single();

  const systemPrompt = promptRow?.prompt ?? DEFAULT_PROMPT;

  const leadsSummary = leads.map((l) => {
    const interactions = (l.lead_interactions as Array<{ contact_type: string; created_at: string; next_followup_date: string | null }>) ?? [];
    const lastContact = interactions[0]?.created_at ?? null;
    const nextFollowup = interactions[0]?.next_followup_date ?? null;
    const noContestCount = interactions.filter((i) => i.contact_type === "no_contesta").length;
    const daysSinceContact = lastContact
      ? Math.floor((Date.now() - new Date(lastContact).getTime()) / 86_400_000)
      : null;

    return [
      `Lead: ${l.full_name}`,
      `Estado: ${l.status}`,
      l.interested_course ? `Curso: ${l.interested_course}` : null,
      `Interacciones totales: ${interactions.length}`,
      daysSinceContact !== null ? `Último contacto: hace ${daysSinceContact} días` : "Sin contacto previo",
      noContestCount > 0 ? `No contesta: ${noContestCount} veces` : null,
      nextFollowup ? `Próximo seguimiento: ${nextFollowup}` : null,
    ].filter(Boolean).join(" | ");
  }).join("\n");

  const userMessage = isJefe
    ? `Genera el briefing diario para el equipo comercial de Esmera Online (${today}).\n\nLEADS ACTIVOS DEL EQUIPO:\n${leadsSummary}`
    : `Genera el briefing diario para ${currentUser.fullName} (${today}).\n\nMIS LEADS ACTIVOS:\n${leadsSummary}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { content: null, isNew: false, error: `OpenAI error: ${err.slice(0, 100)}` };
    }

    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const content = json.choices[0]?.message?.content?.trim() ?? "";

    if (!content) return { content: null, isNew: false, error: "Respuesta vacía de OpenAI" };

    await supabase.from("daily_briefings").insert({
      user_id: currentUser.id,
      briefing_date: today,
      content,
    });

    return { content, isNew: true };
  } catch (e) {
    return { content: null, isNew: false, error: String(e) };
  }
}
