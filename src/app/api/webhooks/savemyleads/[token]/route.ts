import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";

const tag = "[webhook/savemyleads]";

function extract(body: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = body[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const expected = process.env.SAVEMYLEADS_TOKEN;
  if (!expected || token !== expected) {
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }
  return Response.json({ ok: true, route: "/api/webhooks/savemyleads/[token]", status: "reachable" });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  /* ── 1. Autenticar por token en el path ── */
  const { token } = await params;
  const expected = process.env.SAVEMYLEADS_TOKEN;

  if (!expected) {
    console.error(tag, "SAVEMYLEADS_TOKEN env var not set");
    return Response.json({ error: "webhook_not_configured" }, { status: 500 });
  }
  if (token !== expected) {
    console.warn(tag, "Invalid token");
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  /* ── 2. Parsear body — acepta JSON y form-urlencoded ── */
  const rawBody = await req.text();
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    body = Object.fromEntries(params.entries());
  } else {
    try {
      body = JSON.parse(rawBody);
    } catch {
      await supabase.from("webhook_logs").insert({
        source: "savemyleads",
        raw_body: rawBody,
        payload: null,
        result: { error: "invalid_json" },
      });
      console.error(tag, "Invalid body:", rawBody.slice(0, 500));
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
  }

  /* Guardar payload en webhook_logs para diagnóstico */
  await supabase.from("webhook_logs").insert({
    source: "savemyleads",
    raw_body: rawBody,
    payload: body as import("@/types/database.types").Json,
    result: null,
  });

  console.log(tag, "Payload received:", JSON.stringify(body));

  /* ── 3. Mapear campos ── */
  const firstName = extract(body, ["first_name", "firstName", "nombre"]);
  const lastName  = extract(body, ["last_name",  "lastName",  "apellidos", "apellido"]);

  const fullName =
    extract(body, ["full_name", "fullName", "name", "nombre_completo"]) ??
    (firstName && lastName ? `${firstName} ${lastName}` : firstName ?? lastName ?? null);

  const email = extract(body, ["email", "email_address", "correo", "e_mail"]);

  const phone = extract(body, [
    "phone", "phone_number", "phoneNumber",
    "telefono", "teléfono", "movil", "móvil", "mobile", "tel",
  ]);

  const interestedCourse = extract(body, [
    "interested_course", "interestedCourse",
    "curso_interes", "curso", "course", "formulario", "campaign_name", "ad_name",
  ]);

  const notes = extract(body, ["notes", "notas", "message", "comments", "mensaje"]);

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

  /* ── 5. Deduplicar — 200 para que SaveMyLeads no reintente ── */
  const [{ data: dupLead }, { data: dupStudent }] = await Promise.all([
    supabase.from("leads").select("id").eq("phone", cleanPhone).maybeSingle(),
    supabase.from("students").select("id").eq("phone", cleanPhone).is("deleted_at", null).maybeSingle(),
  ]);

  if (dupLead || dupStudent) {
    console.log(tag, "Duplicate phone — skipping silently:", cleanPhone);
    return Response.json({ ok: true, skipped: true, reason: "duplicate" });
  }

  /* ── 6. Insertar lead ── */
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      full_name: fullName,
      email:     email ?? null,
      phone:     cleanPhone,
      source:    "meta_ads",
      status:    "nuevo",
      interested_course: interestedCourse ?? null,
      notes:     notes ?? null,
    })
    .select("id, full_name, phone, source, status")
    .single();

  if (error) {
    console.error(tag, "DB insert error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  console.log(tag, "Lead created:", lead.id, "|", lead.full_name);
  return Response.json({ ok: true, lead }, { status: 201 });
}
