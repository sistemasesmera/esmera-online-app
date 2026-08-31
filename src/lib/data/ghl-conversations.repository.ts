import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";
import { fetchGhlConversations } from "@/lib/ghl/api";

export type ConversationThread = {
  ghl_conversation_id: string;
  ghl_contact_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  lead_id: string | null;
  student_id: string | null;
};

export async function listConversationThreads(): Promise<ConversationThread[]> {
  const conversations = await fetchGhlConversations(100);
  if (conversations.length === 0) return [];

  // Recopilar teléfonos para buscar leads/alumnos en un solo query batch
  const phones = conversations
    .map((c) => (c.phone ? normalizePhone(c.phone) : null))
    .filter((p): p is string => p !== null);

  const supabase = createAdminClient();

  const [{ data: leads }, { data: students }] = await Promise.all([
    phones.length > 0
      ? supabase.from("leads").select("id, phone").in("phone", phones)
      : Promise.resolve({ data: [] as { id: string; phone: string | null }[] }),
    phones.length > 0
      ? supabase
          .from("students")
          .select("id, phone")
          .in("phone", phones)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as { id: string; phone: string | null }[] }),
  ]);

  const leadByPhone = new Map((leads ?? []).map((l) => [l.phone, l.id]));
  const studentByPhone = new Map((students ?? []).map((s) => [s.phone, s.id]));

  return conversations.map((c) => {
    const cleanPhone = c.phone ? normalizePhone(c.phone) : null;
    return {
      ghl_conversation_id: c.id,
      ghl_contact_id: c.contactId,
      contact_name: c.fullName ?? c.contactName ?? null,
      contact_phone: cleanPhone,
      contact_email: c.email ?? null,
      last_message: c.lastMessage ?? null,
      last_message_at: c.lastMessageDate ?? null,
      unread_count: c.unreadCount ?? 0,
      lead_id: cleanPhone ? (leadByPhone.get(cleanPhone) ?? null) : null,
      student_id: cleanPhone ? (studentByPhone.get(cleanPhone) ?? null) : null,
    };
  });
}
