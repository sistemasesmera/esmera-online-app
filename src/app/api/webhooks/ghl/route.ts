import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";

const tag = "[webhook/ghl]";

export async function GET() {
  return Response.json({ ok: true, route: "/api/webhooks/ghl", status: "reachable" });
}

export async function POST(req: NextRequest) {
  /* ── 1. Autenticar por token en la URL ── */
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.GHL_WEBHOOK_TOKEN;

  if (!expected) {
    console.error(tag, "GHL_WEBHOOK_TOKEN env var not set");
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
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  console.log(tag, "Payload received:", JSON.stringify(body));

  /* ── 3. Extraer campos del payload GHL ──
     GHL outbound webhook (workflow action) envía los datos del contacto
     directamente en el root, con el mensaje en un objeto "message" anidado.
     Se aceptan variantes de nombre por si cambia entre versiones de GHL.
  */
  const ghlContactId = pick(body, ["id", "contactId", "contact_id"]);
  const ghlConversationId =
    pickNested(body, "conversation", "id") ??
    pick(body, ["conversationId", "conversation_id"]);

  const contactName = pick(body, ["name", "full_name", "fullName", "contact_name"]);
  const rawPhone = pick(body, ["phone", "phoneNumber", "phone_number"]);
  const contactEmail = pick(body, ["email"]);

  const messageBody =
    pickNested(body, "message", "body") ??
    pick(body, ["message_body", "body", "text"]);

  const messageType =
    pickNested(body, "message", "type") ??
    pick(body, ["message_type", "channel", "type"]) ??
    "WhatsApp";

  const direction =
    pickNested(body, "message", "direction") ??
    pick(body, ["direction"]) ??
    "inbound";

  const messageStatus =
    pickNested(body, "message", "status") ??
    pick(body, ["message_status", "status"]) ??
    null;

  /* ── 4. Validar obligatorios ── */
  if (!ghlContactId) {
    console.warn(tag, "Missing contact id in payload");
    return Response.json({ error: "contact id requerido" }, { status: 422 });
  }
  if (!messageBody) {
    console.warn(tag, "Missing message body in payload");
    return Response.json({ error: "message body requerido" }, { status: 422 });
  }

  const supabase = createAdminClient();
  const cleanPhone = rawPhone ? normalizePhone(rawPhone) : null;

  /* ── 5. Vincular con lead o alumno existente por teléfono ── */
  let leadId: string | null = null;
  let studentId: string | null = null;

  if (cleanPhone) {
    const [{ data: lead }, { data: student }] = await Promise.all([
      supabase
        .from("leads")
        .select("id")
        .eq("phone", cleanPhone)
        .neq("status", "convertido")
        .maybeSingle(),
      supabase
        .from("students")
        .select("id")
        .eq("phone", cleanPhone)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);
    leadId = lead?.id ?? null;
    studentId = student?.id ?? null;
  }

  /* ── 6. Insertar mensaje ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("ghl_conversations")
    .insert({
      ghl_contact_id: ghlContactId,
      ghl_conversation_id: ghlConversationId ?? null,
      contact_name: contactName ?? null,
      contact_phone: cleanPhone,
      contact_email: contactEmail ?? null,
      message_body: messageBody,
      message_type: messageType,
      direction,
      message_status: messageStatus,
      lead_id: leadId,
      student_id: studentId,
      raw_payload: body,
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error(tag, "DB insert error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  console.log(tag, "Message saved:", data.id, "| contact:", ghlContactId, "| lead:", leadId, "| student:", studentId);
  return Response.json({ ok: true, id: data.id }, { status: 201 });
}

/* ── helpers ── */
function pick(body: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = body[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function pickNested(
  body: Record<string, unknown>,
  parent: string,
  key: string,
): string | null {
  const p = body[parent];
  if (p && typeof p === "object" && !Array.isArray(p)) {
    const v = (p as Record<string, unknown>)[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}
