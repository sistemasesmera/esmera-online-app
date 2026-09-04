"use server";

import { requireRole } from "@/lib/auth/require-role";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { normalizePhone } from "@/lib/utils/phone";
import { fetchGhlMessages, type GhlMessage } from "@/lib/ghl/api";
import {
  listConversationThreads,
  type ConversationThread,
  type ConversationThreadsPage,
} from "@/lib/data/ghl-conversations.repository";

/* ── Cargar más conversaciones (paginación) ── */
export async function fetchMoreConversations(opts: {
  startAfter: number | null;
  startAfterId: string | null;
  query?: string;
}): Promise<ConversationThreadsPage & { ok: boolean; error?: string }> {
  await requireRole(CAPABILITIES.viewConversations);
  try {
    const page = await listConversationThreads({
      startAfter: opts.startAfter ?? undefined,
      startAfterId: opts.startAfterId ?? undefined,
      query: opts.query,
    });
    return { ok: true, ...page };
  } catch (err) {
    return { ok: false, error: String(err), threads: [], hasMore: false, startAfter: null, startAfterId: null };
  }
}

const GHL_API_BASE = "https://services.leadconnectorhq.com";

/* ── Tipo normalizado para el cliente ── */
export type MessageDisplay = {
  id: string;
  body: string;
  direction: "inbound" | "outbound";
  dateAdded: string;
  attachments: string[];
  mediaType: "text" | "audio" | "image" | "video" | "document" | "other";
};

function normalizeMessage(msg: GhlMessage): MessageDisplay {
  const hasAttachments = msg.attachments && msg.attachments.length > 0;
  const contentType = msg.contentType ?? "";

  let mediaType: MessageDisplay["mediaType"] = "text";
  if (hasAttachments || msg.type === 19 || contentType.startsWith("audio")) {
    mediaType = "audio";
  } else if (msg.type === 10 || contentType.startsWith("image")) {
    mediaType = "image";
  } else if (msg.type === 11 || contentType.startsWith("video")) {
    mediaType = "video";
  } else if (msg.type === 12 || contentType.startsWith("application")) {
    mediaType = "document";
  }

  const body =
    (msg.body && msg.body !== "…" && msg.body !== "...") ? msg.body :
    mediaType === "audio" ? "🎤 Nota de voz" :
    mediaType === "image" ? "🖼️ Imagen" :
    mediaType === "video" ? "🎥 Vídeo" :
    mediaType === "document" ? "📄 Documento" :
    "📎 Archivo";

  return {
    id: msg.id,
    body,
    direction: msg.direction ?? "inbound",
    dateAdded: msg.dateAdded,
    attachments: msg.attachments ?? [],
    mediaType,
  };
}

/* ── Cargar mensajes de una conversación desde GHL ── */
export async function loadConversationMessages(conversationId: string): Promise<{
  ok: boolean;
  messages?: MessageDisplay[];
  error?: string;
}> {
  await requireRole(CAPABILITIES.viewConversations);

  try {
    const msgs = await fetchGhlMessages(conversationId);
    const sorted = [...msgs].sort(
      (a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime(),
    );
    return { ok: true, messages: sorted.map(normalizeMessage) };
  } catch (err) {
    console.error("[loadConversationMessages]", err);
    return { ok: false, error: String(err) };
  }
}

/* ── Subir y enviar nota de voz via GHL ── */
export async function sendVoiceNote(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireRole(CAPABILITIES.viewConversations);

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) return { ok: false, error: "Credenciales GHL no configuradas" };

  const ghlContactId = formData.get("ghlContactId") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const conversationId = formData.get("conversationId") as string;
  const audioFile = formData.get("audio") as File;

  if (!audioFile || audioFile.size === 0) return { ok: false, error: "Audio vacío" };

  const toNumber = normalizePhone(contactPhone);
  if (!toNumber) return { ok: false, error: "El contacto no tiene teléfono" };

  // 1. Subir archivo a GHL
  const uploadForm = new FormData();
  uploadForm.append("locationId", locationId);
  uploadForm.append("conversationId", conversationId);
  const ext = audioFile.type.includes("mp4") ? "mp4" : audioFile.type.includes("ogg") ? "ogg" : "webm";
  uploadForm.append("fileAttachment", audioFile, `voice-note.${ext}`);

  const uploadRes = await fetch(`${GHL_API_BASE}/conversations/messages/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-04-15" },
    body: uploadForm,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error("[ghl/upload]", uploadRes.status, err);
    return { ok: false, error: `Error subiendo archivo: ${uploadRes.status}` };
  }

  const uploadData = await uploadRes.json();
  const fileUrl: string | undefined = Array.isArray(uploadData.uploadedFiles)
    ? uploadData.uploadedFiles[0]
    : Object.values(uploadData.uploadedFiles ?? {})[0] as string | undefined;
  if (!fileUrl) return { ok: false, error: "GHL no devolvió URL del archivo" };

  // 2. Enviar mensaje con el adjunto
  const sendRes = await fetch(`${GHL_API_BASE}/conversations/messages`, {
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
      attachments: [fileUrl],
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    console.error("[ghl/send-voice]", sendRes.status, err);
    return { ok: false, error: `Error enviando nota: ${sendRes.status}` };
  }

  return { ok: true };
}

/* ── Marcar conversación como leída en GHL ── */
export async function markConversationRead(conversationId: string): Promise<void> {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) return;
  try {
    await fetch(`${GHL_API_BASE}/conversations/${conversationId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Version: "2021-04-15",
      },
      body: JSON.stringify({ unreadCount: 0 }),
    });
  } catch {
    // best-effort, no critical
  }
}

/* ── Enviar mensaje via GHL API ── */
export async function sendConversationMessage(
  ghlContactId: string,
  contactPhone: string | null,
  messageText: string,
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  await requireRole(CAPABILITIES.viewConversations);

  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) return { ok: false, error: "GHL_API_KEY no configurada" };

  const text = messageText.trim();
  if (!text) return { ok: false, error: "Mensaje vacío" };

  const toNumber = contactPhone ? normalizePhone(contactPhone) : null;
  if (!toNumber) return { ok: false, error: "El contacto no tiene teléfono" };

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
    return { ok: true, messageId: data.messageId ?? data.id };
  } catch (err) {
    console.error("[ghl/send] fetch error:", err);
    return { ok: false, error: "Error de red al contactar GHL" };
  }
}
