import "server-only";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: "2021-04-15",
  };
}

export type GhlConversation = {
  id: string;
  contactId: string;
  locationId: string;
  fullName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  type: string | null;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageDate: string | null;
  lastMessageType: string | null;
  inbox: string | null;
  starred: boolean;
};

export type GhlMessage = {
  id: string;
  type: number;
  body: string | null;
  direction: "inbound" | "outbound";
  dateAdded: string;
  status: string | null;
  contentType: string | null;
  attachments: string[];
  source: string | null;
  userId: string | null;
};

export type GhlConversationsPage = {
  conversations: GhlConversation[];
  hasMore: boolean;
  startAfter: number | null;
  startAfterId: string | null;
};

export async function fetchGhlConversations(opts: {
  limit?: number;
  startAfter?: number;
  startAfterId?: string;
  query?: string;
} = {}): Promise<GhlConversationsPage> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) throw new Error("GHL_LOCATION_ID not set");
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const { limit = 20, startAfter, startAfterId, query } = opts;

  const url = new URL(`${GHL_API_BASE}/conversations/search`);
  url.searchParams.set("locationId", locationId);
  url.searchParams.set("limit", String(limit));
  if (startAfter) url.searchParams.set("startAfter", String(startAfter));
  if (startAfterId) url.searchParams.set("startAfterId", startAfterId);
  if (query?.trim()) url.searchParams.set("q", query.trim());

  const res = await fetch(url.toString(), {
    headers: ghlHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[ghl/conversations]", res.status, err);
    throw new Error(`GHL API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const conversations = (data.conversations ?? []) as GhlConversation[];
  const meta = data.meta ?? {};

  return {
    conversations,
    hasMore: conversations.length === limit,
    startAfter: meta.startAfter ?? null,
    startAfterId: meta.startAfterId ?? null,
  };
}

export async function fetchGhlMessages(conversationId: string, limit = 100): Promise<GhlMessage[]> {
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const url = new URL(`${GHL_API_BASE}/conversations/${conversationId}/messages`);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: ghlHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[ghl/messages]", res.status, err);
    throw new Error(`GHL messages API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  // GHL puede devolver messages anidado de distintas formas según la versión
  const msgs = data.messages?.messages ?? data.messages ?? data;
  return Array.isArray(msgs) ? (msgs as GhlMessage[]) : [];
}
