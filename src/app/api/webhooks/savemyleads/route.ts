import { NextRequest } from "next/server"; // v3
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";
import type { SupabaseClient } from "@supabase/supabase-js";

const tag = "[webhook/savemyleads]"; // v2

// ID del usuario sistema que firma las notas automáticas (sistemas@esmeraschool.com)
const SYSTEM_USER_ID = "3f961910-a5ae-4851-bd44-a336aeb26a3b";

/* ── field aliases that SaveMyLeads / Meta Lead Ads may send ── */
function extract(body: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = body[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

async function insertNota(supabase: SupabaseClient, leadId: string, text: string) {
  const { error } = await supabase.from("lead_interactions").insert({
    lead_id: leadId,
    user_id: SYSTEM_USER_ID,
    contact_type: "nota_interna",
    notes: text,
  });
  if (error) console.error(tag, "Error inserting nota_interna:", error.message);
}

async function logActivity(supabase: SupabaseClient, leadId: string, leadName: string, action: string, description: string) {
  const { error } = await supabase.from("activity_logs").insert({
    user_id: SYSTEM_USER_ID,
    user_name: "Sistema",
    action,
    entity_type: "lead",
    entity_id: leadId,
    entity_name: leadName,
    description,
    lead_id: leadId,
    metadata: { source: "meta_ads_webhook" },
  });
  if (error) console.error(tag, "Error logging activity:", error.message);
}

export async function GET() {
  return Response.json({ ok: true, route: "/api/webhooks/savemyleads", status: "reachable" });
}

export async function POST(req: NextRequest) {
  /* ── 1. Autenticar por token en la URL ── */
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.SAVEMYLEADS_TOKEN;

  if (!expected) {
    console.error(tag, "SAVEMYLEADS_TOKEN env var not set");
    return Response.json({ error: "webhook_not_configured" }, { status: 500 });
  }
  if (!token || token !== expected) {
    console.warn(tag, "Invalid token");
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  /* ── 2. Parsear body ── */
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    console.error(tag, "Invalid JSON body");
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  console.log(tag, "Payload received:", JSON.stringify(body));

  /* ── 3. Mapear campos (acepta nombres de Meta, SaveMyLeads y nuestros propios) ── */
  const firstName = extract(body, ["first_name", "firstName", "nombre"]);
  const lastName = extract(body, ["last_name", "lastName", "apellidos", "apellido"]);

  const fullName =
    extract(body, ["full_name", "fullName", "name", "nombre_completo"]) ??
    (firstName && lastName ? `${firstName} ${lastName}` : firstName ?? lastName ?? null);

  const email = extract(body, ["email", "email_address", "correo", "e_mail"]);

  const phone = extract(body, [
    "phone",
    "phone_number",
    "phoneNumber",
    "telefono",
    "teléfono",
    "movil",
    "móvil",
    "mobile",
    "tel",
  ]);

  const interestedCourse = extract(body, [
    "interested_course",
    "interestedCourse",
    "curso",
    "course",
    "formulario",
    "campaign_name",
    "ad_name",
  ]);

  const notes = extract(body, ["notes", "notas", "message", "comments", "mensaje"]);

  const pregunta1 = extract(body, ["cuando_empezar", "pregunta1"]);
  const pregunta2 = extract(body, ["en_que_momento_contactar", "pregunta2"]);
  const pregunta3 = extract(body, ["dispuesto_a_invertir", "pregunta3"]);

  const pregunta1Label = extract(body, ["pregunta1_label"]);
  const pregunta2Label = extract(body, ["pregunta2_label"]);
  const pregunta3Label = extract(body, ["pregunta3_label"]);

  /* ── 4. Validar obligatorios ── */
  if (!fullName) {
    console.warn(tag, "Missing full_name in payload");
    return Response.json({ error: "full_name requerido" }, { status: 422 });
  }
  if (!phone) {
    console.warn(tag, "Missing phone in payload");
    return Response.json({ error: "phone requerido" }, { status: 422 });
  }

  const cleanPhone = normalizePhone(phone);
  const supabase = createAdminClient();

  /* ── 5. Deduplicar con lógica de reactivación ── */
  const [{ data: existingLead }, { data: dupStudent }] = await Promise.all([
    supabase.from("leads").select("id, status").eq("phone", cleanPhone).maybeSingle(),
    supabase.from("students").select("id").eq("phone", cleanPhone).is("deleted_at", null).maybeSingle(),
  ]);

  // Ya es alumno — ignorar para que SaveMyLeads no reintente
  if (dupStudent) {
    console.log(tag, "Phone belongs to existing student — skipping:", cleanPhone);
    return Response.json({ ok: true, skipped: true, reason: "existing_student" }, { status: 200 });
  }

  if (existingLead) {
    if (existingLead.status === "descartado") {
      // Reactivar: volver a "nuevo" + actualizar datos + nota interna en el CRM
      const { data: lead, error } = await supabase
        .from("leads")
        .update({
          full_name: fullName,
          email: email ?? null,
          status: "nuevo",
          interested_course: interestedCourse ?? null,
          pregunta1: pregunta1 ?? null,
          pregunta2: pregunta2 ?? null,
          pregunta3: pregunta3 ?? null,
          pregunta1_label: pregunta1Label ?? null,
          pregunta2_label: pregunta2Label ?? null,
          pregunta3_label: pregunta3Label ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLead.id)
        .select("id, full_name, phone, source, status")
        .single();

      if (error) {
        console.error(tag, "DB reactivation error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
      }

      const cursoInfo = interestedCourse ? ` interesado/a en ${interestedCourse}.` : ".";
      const reactivationText = `Lead reactivado — nueva solicitud recibida vía Meta Ads${cursoInfo}`;
      await Promise.all([
        insertNota(supabase, lead.id, reactivationText),
        logActivity(supabase, lead.id, lead.full_name, "lead.reactivated", reactivationText),
      ]);

      console.log(tag, "Lead reactivated:", lead.id, "|", lead.full_name);
      return Response.json({ ok: true, lead, reactivated: true }, { status: 200 });
    } else {
      // Lead activo — nota interna sin tocar estado ni asignación
      const cursoInfo = interestedCourse ? ` interesado/a en ${interestedCourse}` : "";
      const activeText = `Nueva solicitud recibida vía Meta Ads${cursoInfo} (lead en estado "${existingLead.status}").`;
      await Promise.all([
        insertNota(supabase, existingLead.id, activeText),
        logActivity(supabase, existingLead.id, fullName, "lead.new_submission", activeText),
      ]);

      console.log(tag, "Active lead — nota_interna inserted:", cleanPhone);
      return Response.json({ ok: true, skipped: true, reason: "active_lead" }, { status: 200 });
    }
  }

  /* ── 6. Insertar lead ── */
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      full_name: fullName,
      email: email ?? null,
      phone: cleanPhone,
      source: "meta_ads",
      status: "nuevo",
      interested_course: interestedCourse ?? null,
      notes: notes ?? null,
      pregunta1: pregunta1 ?? null,
      pregunta2: pregunta2 ?? null,
      pregunta3: pregunta3 ?? null,
      pregunta1_label: pregunta1Label ?? null,
      pregunta2_label: pregunta2Label ?? null,
      pregunta3_label: pregunta3Label ?? null,
    })
    .select("id, full_name, phone, source, status")
    .single();

  if (error) {
    console.error(tag, "DB insert error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, lead.id, lead.full_name, "lead.created", `Lead creado vía Meta Ads${interestedCourse ? ` — curso: ${interestedCourse}` : ""}.`);

  console.log(tag, "Lead created:", lead.id, "|", lead.full_name);
  return Response.json({ ok: true, lead }, { status: 201 });
}
