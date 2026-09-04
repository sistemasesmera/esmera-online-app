import "server-only";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: "2021-04-15",
  };
}

/* ─── Pipeline / Opportunity types ─── */

export type GhlPipelineStage = {
  id: string;
  name: string;
  position: number;
};

export type GhlPipeline = {
  id: string;
  name: string;
  stages: GhlPipelineStage[];
};

export type GhlOpportunity = {
  id: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  status: "open" | "won" | "lost" | "abandoned";
  monetaryValue: number | null;
  assignedTo: string | null;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export async function fetchGhlPipelines(): Promise<GhlPipeline[]> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) throw new Error("GHL_LOCATION_ID not set");
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const url = new URL(`${GHL_API_BASE}/opportunities/pipelines`);
  url.searchParams.set("locationId", locationId);

  const res = await fetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL pipelines error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return (data.pipelines ?? []) as GhlPipeline[];
}

export async function fetchGhlOpportunities(pipelineId: string): Promise<GhlOpportunity[]> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) throw new Error("GHL_LOCATION_ID not set");
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const all: GhlOpportunity[] = [];
  let startAfterId: string | undefined;

  // Paginar hasta vaciar (máx 100 por página)
  do {
    const url = new URL(`${GHL_API_BASE}/opportunities/search`);
    url.searchParams.set("location_id", locationId);
    url.searchParams.set("pipeline_id", pipelineId);
    url.searchParams.set("limit", "100");
    if (startAfterId) url.searchParams.set("startAfterId", startAfterId);

    const res = await fetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GHL opportunities error ${res.status}: ${err}`);
    }
    const data = await res.json();
    const page = (data.opportunities ?? []) as GhlOpportunity[];
    all.push(...page);
    startAfterId = data.meta?.startAfterId ?? undefined;
    if (page.length < 100) break;
  } while (startAfterId);

  return all;
}

export async function searchGhlOpportunitiesByPhone(phone: string): Promise<GhlOpportunity[]> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId || !process.env.GHL_API_KEY) return [];

  const url = new URL(`${GHL_API_BASE}/opportunities/search`);
  url.searchParams.set("location_id", locationId);
  url.searchParams.set("q", phone);
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.opportunities ?? []) as GhlOpportunity[];
}

export async function updateGhlOpportunity(
  id: string,
  data: { pipelineStageId?: string; status?: string; monetaryValue?: number }
): Promise<void> {
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const res = await fetch(`${GHL_API_BASE}/opportunities/${id}`, {
    method: "PUT",
    headers: ghlHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL update opportunity error ${res.status}: ${err}`);
  }
}

export async function fetchGhlContactCustomFieldValue(
  contactId: string,
  fieldId: string
): Promise<string | null> {
  if (!process.env.GHL_API_KEY) return null;
  const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
    headers: ghlHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  const fields: { id: string; value: string }[] = data.contact?.customFields ?? [];
  return fields.find((f) => f.id === fieldId)?.value ?? null;
}

export type GhlNote = {
  id: string;
  body: string;
  dateAdded: string;
  userId: string | null;
};

export async function fetchGhlOpportunity(id: string): Promise<GhlOpportunity | null> {
  if (!process.env.GHL_API_KEY) return null;
  const res = await fetch(`${GHL_API_BASE}/opportunities/${id}`, {
    headers: ghlHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.opportunity ?? data) as GhlOpportunity;
}

export async function fetchGhlContactNotes(contactId: string): Promise<GhlNote[]> {
  if (!process.env.GHL_API_KEY) return [];
  const url = new URL(`${GHL_API_BASE}/contacts/${contactId}/notes`);
  const res = await fetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.notes ?? []) as GhlNote[];
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
  lastMessageBody: string | null;
  lastMessageDate: string | null;
  lastMessageType: string | null;
  messageTypes: number[];
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
