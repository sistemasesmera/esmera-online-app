import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type GhlMessage = {
  id: string;
  ghl_contact_id: string;
  ghl_conversation_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  message_body: string;
  message_type: string;
  direction: string;
  message_status: string | null;
  lead_id: string | null;
  student_id: string | null;
  received_at: string;
};

export type ConversationThread = {
  ghl_contact_id: string;
  ghl_conversation_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  lead_id: string | null;
  student_id: string | null;
  message_type: string;
  last_message: string;
  last_message_at: string;
  message_count: number;
  messages: GhlMessage[];
};

export async function listConversationThreads(): Promise<ConversationThread[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  const { data, error } = await supabase
    .from("ghl_conversations")
    .select(
      "id, ghl_contact_id, ghl_conversation_id, contact_name, contact_phone, contact_email, message_body, message_type, direction, message_status, lead_id, student_id, received_at",
    )
    .order("received_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const messages = data as GhlMessage[];

  // Group by ghl_contact_id, preserving insertion order (most recent first)
  const map = new Map<string, ConversationThread>();

  for (const msg of messages) {
    if (!map.has(msg.ghl_contact_id)) {
      map.set(msg.ghl_contact_id, {
        ghl_contact_id: msg.ghl_contact_id,
        ghl_conversation_id: msg.ghl_conversation_id,
        contact_name: msg.contact_name,
        contact_phone: msg.contact_phone,
        contact_email: msg.contact_email,
        lead_id: msg.lead_id,
        student_id: msg.student_id,
        message_type: msg.message_type,
        last_message: msg.message_body,
        last_message_at: msg.received_at,
        message_count: 0,
        messages: [],
      });
    }
    const thread = map.get(msg.ghl_contact_id)!;
    thread.message_count++;
    thread.messages.push(msg);
  }

  // Messages within each thread in chronological order for display
  const threads = Array.from(map.values());
  for (const thread of threads) {
    thread.messages.sort(
      (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
    );
  }

  return threads;
}
