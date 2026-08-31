import type { Metadata } from "next";
export const metadata: Metadata = { title: "Conversaciones" };

import { requireRole } from "@/lib/auth/require-role";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { listConversationThreads } from "@/lib/data/ghl-conversations.repository";
import { ConversationsInbox } from "@/components/features/conversations/conversations-inbox";

export default async function ConversacionesPage() {
  await requireRole(CAPABILITIES.viewConversations);
  const threads = await listConversationThreads();

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -mt-2">
      <h1 className="text-2xl font-black tracking-tight mb-4">Conversaciones</h1>
      <ConversationsInbox threads={threads} />
    </div>
  );
}
