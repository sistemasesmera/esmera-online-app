import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";
import type { SupabaseClient } from "@supabase/supabase-js";

const LEAD_SOURCES = ["web", "meta_ads", "organico", "referido", "redes_sociales", "llamada_entrante", "evento", "agente_web", "otro"] as const;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
};

// ID del usuario sistema que firma las notas automáticas (sistemas@esmeraschool.com)
const SYSTEM_USER_ID = "3f961910-a5ae-4851-bd44-a336aeb26a3b";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function authenticate(req: NextRequest): boolean {
  const key = process.env.PUBLIC_API_KEY;
  if (!key) return false;
  const auth = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return auth === key;
}

async function insertNota(supabase: SupabaseClient, leadId: string, text: string) {
  const { error } = await supabase.from("lead_interactions").insert({
    lead_id: leadId,
    user_id: SYSTEM_USER_ID,
    contact_type: "nota_interna",
    notes: text,
  });
  if (error) console.error("[public/leads]", "Error inserting nota_interna:", error.message);
}

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return Response.json({ error: "API key inválida o ausente" }, { status: 401, headers: CORS_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400, headers: CORS_HEADERS });
  }

  const { full_name, email, phone, source, interested_course, notes } = body;

  if (!full_name || typeof full_name !== "string" || !String(full_name).trim()) {
    return Response.json({ error: "full_name es requerido" }, { status: 422, headers: CORS_HEADERS });
  }
  if (!phone || typeof phone !== "string" || !String(phone).trim()) {
    return Response.json({ error: "phone es requerido" }, { status: 422, headers: CORS_HEADERS });
  }
  if (source && !LEAD_SOURCES.includes(source as typeof LEAD_SOURCES[number])) {
    return Response.json({ error: `source debe ser uno de: ${LEAD_SOURCES.join(", ")}` }, { status: 422, headers: CORS_HEADERS });
  }

  const cleanPhone = normalizePhone(String(phone).trim());
  const supabase = createAdminClient();

  const [{ data: existingLead }, { data: existingStudent }] = await Promise.all([
    supabase.from("leads").select("id, status").eq("phone", cleanPhone).maybeSingle(),
    supabase.from("students").select("id").eq("phone", cleanPhone).is("deleted_at", null).maybeSingle(),
  ]);

  // Ya es alumno — aceptar silenciosamente sin exponer datos
  if (existingStudent) {
    return Response.json({ ok: true, skipped: true }, { status: 201, headers: CORS_HEADERS });
  }

  if (existingLead) {
    const cursoInfo = interested_course ? ` interesado/a en ${String(interested_course).trim()}` : "";
    const now = new Date().toISOString();

    if (existingLead.status === "descartado") {
      // Reactivar: volver a "nuevo" + actualizar datos + nota interna
      const { data: lead, error } = await supabase
        .from("leads")
        .update({
          full_name: String(full_name).trim(),
          email: email ? String(email).trim() : null,
          status: "nuevo",
          interested_course: interested_course ? String(interested_course).trim() : null,
          updated_at: now,
        })
        .eq("id", existingLead.id)
        .select("id, full_name, phone, source, status")
        .single();

      if (error) {
        return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
      }

      await insertNota(supabase, lead.id, `Lead reactivado — nueva solicitud recibida vía web${cursoInfo}.`);
      return Response.json({ ok: true, lead, reactivated: true }, { status: 201, headers: CORS_HEADERS });
    }

    // Lead activo — nota interna + actualizar updated_at sin tocar estado ni asignación
    await Promise.all([
      supabase.from("leads").update({ updated_at: now }).eq("id", existingLead.id),
      insertNota(supabase, existingLead.id, `Nueva solicitud recibida vía web${cursoInfo} (lead en estado "${existingLead.status}").`),
    ]);

    return Response.json({ ok: true, skipped: true, reason: "active_lead" }, { status: 201, headers: CORS_HEADERS });
  }

  // Lead nuevo — insertar
  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: String(full_name).trim(),
      email:     email ? String(email).trim() : null,
      phone:     cleanPhone,
      source:    (source as typeof LEAD_SOURCES[number]) ?? "agente_web",
      status:    "nuevo",
      interested_course: interested_course ? String(interested_course).trim() : null,
      notes:     notes ? String(notes).trim() : null,
    })
    .select("id, full_name, email, phone, source, status, interested_course, created_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  return Response.json({ ok: true, lead: data }, { status: 201, headers: CORS_HEADERS });
}
