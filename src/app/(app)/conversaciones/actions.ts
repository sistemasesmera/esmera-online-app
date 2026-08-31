"use server";

import { requireRole } from "@/lib/auth/require-role";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

export async function sendConversationMessage(
  ghlContactId: string,
  contactPhone: string | null,
  messageText: string,
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const user = await requireRole(CAPABILITIES.viewConversations);

  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) return { ok: false, error: "GHL_API_KEY no configurada" };

  const text = messageText.trim();
  if (!text) return { ok: false, error: "Mensaje vacío" };

  const toNumber = contactPhone ? normalizePhone(contactPhone) : null;
  if (!toNumber) return { ok: false, error: "El contacto no tiene teléfono" };

  /* ── 1. Enviar via GHL API ── */
  let ghlMessageId: string | undefined;
  try {
    const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Version: "2021-04-15",
      },
      body: JSON.stringify({
        type: "WhatsApp",
        contactId: ghlContactId,
        toNumber,
        message: text,
        status: "pending",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[ghl/send]", res.status, errBody);
      return { ok: false, error: `GHL error ${res.status}: ${errBody}` };
    }

    const data = await res.json();
    ghlMessageId = data.messageId ?? data.id ?? undefined;
  } catch (err) {
    console.error("[ghl/send] fetch error:", err);
    return { ok: false, error: "Error de red al contactar GHL" };
  }

  /* ── 2. Guardar mensaje saliente en nuestra BD ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  const { error: dbError } = await supabase.from("ghl_conversations").insert({
    ghl_contact_id: ghlContactId,
    contact_phone: toNumber,
    message_body: text,
    message_type: "WhatsApp",
    direction: "outbound",
    message_status: "pending",
    raw_payload: {
      sent_by: user.id,
      sent_by_name: user.fullName,
      ghl_message_id: ghlMessageId,
    },
    received_at: new Date().toISOString(),
  });

  if (dbError) {
    console.error("[ghl/send] DB insert error:", dbError.message);
    // El mensaje ya se envió a GHL — no es un error fatal para el usuario
  }

  return { ok: true, messageId: ghlMessageId };
}
