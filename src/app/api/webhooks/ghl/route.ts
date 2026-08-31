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

  // GHL envía message.type como número para multimedia (19=audio, etc.)
  const rawGhlType = pickNested(body, "message", "type") ?? pick(body, ["message_type", "channel", "type"]);
  const messageType = resolveMessageType(rawGhlType);

  const rawBody = pickNested(body, "message", "body") ?? pick(body, ["message_body", "body", "text"]);
  // Para multimedia el body llega vacío — usamos un placeholder descriptivo
  const messageBody = rawBody || mediaPlaceholder(rawGhlType);

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

/* ── GHL message type number → label ── */
// type es un número interno de GHL para mensajes multimedia de WhatsApp
function resolveMessageType(raw: string | null): string {
  if (!raw) return "WhatsApp";
  const n = Number(raw);
  if (isNaN(n)) return raw; // ya era un string descriptivo
  // tipos conocidos de GHL (WhatsApp)
  if (n === 19) return "WhatsApp_Audio";
  if (n === 10) return "WhatsApp_Image";
  if (n === 11) return "WhatsApp_Video";
  if (n === 12) return "WhatsApp_Document";
  if (n === 8)  return "WhatsApp";
  if (n === 1)  return "SMS";
  if (n === 2)  return "Email";
  return `WhatsApp_Media_${n}`;
}

function mediaPlaceholder(raw: string | null): string {
  const n = Number(raw);
  if (n === 19) return "🎤 Nota de voz";
  if (n === 10) return "🖼️ Imagen";
  if (n === 11) return "🎥 Vídeo";
  if (n === 12) return "📄 Documento";
  return "📎 Archivo multimedia";
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
