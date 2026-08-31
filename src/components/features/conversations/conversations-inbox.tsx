"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { MessageSquare, Search, Phone, Mail, User, GraduationCap, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ConversationThread, GhlMessage } from "@/lib/data/ghl-conversations.repository";
import { sendConversationMessage } from "@/app/(app)/conversaciones/actions";

type Props = {
  threads: ConversationThread[];
};

export function ConversationsInbox({ threads }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    threads[0]?.ghl_contact_id ?? null,
  );
  const [search, setSearch] = useState("");

  // Local message state for optimistic updates
  const [localMessages, setLocalMessages] = useState<Record<string, GhlMessage[]>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.contact_name?.toLowerCase().includes(q) ||
        t.contact_phone?.includes(q) ||
        t.last_message.toLowerCase().includes(q),
    );
  }, [threads, search]);

  const active = threads.find((t) => t.ghl_contact_id === selectedId) ?? null;

  // Merge server messages + optimistic local messages
  const activeMessages = useMemo(() => {
    if (!active) return [];
    const extra = localMessages[active.ghl_contact_id] ?? [];
    return [...active.messages, ...extra].sort(
      (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
    );
  }, [active, localMessages]);

  function addLocalMessage(contactId: string, msg: GhlMessage) {
    setLocalMessages((prev) => ({
      ...prev,
      [contactId]: [...(prev[contactId] ?? []), msg],
    }));
  }

  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border card-shadow">
      {/* ── Left panel: contact list ── */}
      <div className="w-80 shrink-0 flex flex-col border-r bg-background">
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversación…"
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <MessageSquare className="h-8 w-8 opacity-30" />
              {threads.length === 0 ? "Sin conversaciones aún" : "Sin resultados"}
            </div>
          ) : (
            filtered.map((thread) => (
              <ThreadCard
                key={thread.ghl_contact_id}
                thread={thread}
                isActive={thread.ghl_contact_id === selectedId}
                onClick={() => setSelectedId(thread.ghl_contact_id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: message thread ── */}
      {active ? (
        <ThreadDetail
          thread={active}
          messages={activeMessages}
          onMessageSent={(msg) => addLocalMessage(active.ghl_contact_id, msg)}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageSquare className="h-12 w-12 opacity-20" />
          <p className="text-sm">Selecciona una conversación</p>
        </div>
      )}
    </div>
  );
}

/* ── Thread card (left panel item) ── */
function ThreadCard({
  thread,
  isActive,
  onClick,
}: {
  thread: ConversationThread;
  isActive: boolean;
  onClick: () => void;
}) {
  const displayName = thread.contact_name ?? thread.contact_phone ?? "Desconocido";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors border-b last:border-b-0",
        isActive
          ? "bg-primary/8 border-l-2 border-l-primary"
          : "hover:bg-muted/40 border-l-2 border-l-transparent",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
        {initials || <MessageSquare className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-sm font-semibold truncate">{displayName}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatTimeAgo(thread.last_message_at)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{thread.last_message}</p>
        <div className="flex items-center gap-1 mt-1">
          <ChannelBadge type={thread.message_type} />
          {thread.lead_id && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-medium text-amber-600 border-amber-300">
              Lead
            </Badge>
          )}
          {thread.student_id && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-medium text-indigo-600 border-indigo-300">
              Alumno
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Right panel detail ── */
function ThreadDetail({
  thread,
  messages,
  onMessageSent,
}: {
  thread: ConversationThread;
  messages: GhlMessage[];
  onMessageSent: (msg: GhlMessage) => void;
}) {
  const displayName = thread.contact_name ?? thread.contact_phone ?? "Desconocido";
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = draft.trim();
    if (!text || isPending) return;
    setDraft("");
    setError(null);

    // Optimistic update
    const optimistic: GhlMessage = {
      id: `optimistic-${Date.now()}`,
      ghl_contact_id: thread.ghl_contact_id,
      ghl_conversation_id: thread.ghl_conversation_id,
      contact_name: thread.contact_name,
      contact_phone: thread.contact_phone,
      contact_email: thread.contact_email,
      message_body: text,
      message_type: "WhatsApp",
      direction: "outbound",
      message_status: "pending",
      lead_id: thread.lead_id,
      student_id: thread.student_id,
      received_at: new Date().toISOString(),
    };
    onMessageSent(optimistic);

    startTransition(async () => {
      const result = await sendConversationMessage(
        thread.ghl_contact_id,
        thread.contact_phone,
        text,
      );
      if (!result.ok) {
        setError(result.error ?? "Error al enviar");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-background">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm shrink-0">
          {displayName
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? "")
            .join("") || <MessageSquare className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{displayName}</span>
            <ChannelBadge type={thread.message_type} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            {thread.contact_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {thread.contact_phone}
              </span>
            )}
            {thread.contact_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {thread.contact_email}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {thread.lead_id && (
            <Link
              href={`/crm/leads/${thread.lead_id}`}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-200 rounded px-2 py-1 hover:bg-amber-50 transition-colors"
            >
              <User className="h-3 w-3" />
              Ver Lead
            </Link>
          )}
          {thread.student_id && (
            <Link
              href={`/students/${thread.student_id}`}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-50 transition-colors"
            >
              <GraduationCap className="h-3 w-3" />
              Ver Alumno
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-muted/10">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Sin mensajes aún
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t bg-background px-4 py-3">
        {error && (
          <p className="text-xs text-destructive mb-2 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
            className="flex-1 min-h-[42px] max-h-32 resize-none text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!draft.trim() || isPending}
            className="h-10 w-10 shrink-0"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Message bubble ── */
function MessageBubble({ message }: { message: GhlMessage }) {
  const isInbound = message.direction === "inbound";
  const isPending = message.message_status === "pending" && !message.id.startsWith("optimistic");

  return (
    <div className={cn("flex", isInbound ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
          isInbound
            ? "bg-white border text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm",
          isPending && "opacity-60",
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.message_body}</p>
        <p
          className={cn(
            "text-[10px] mt-1 text-right",
            isInbound ? "text-muted-foreground" : "text-primary-foreground/70",
          )}
        >
          {formatDateTime(message.received_at)}
          {message.id.startsWith("optimistic") && " · enviando…"}
        </p>
      </div>
    </div>
  );
}

/* ── Channel badge ── */
function ChannelBadge({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === "whatsapp") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
        <WhatsAppIcon />
        WA
      </span>
    );
  }
  if (t === "sms") {
    return (
      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
        SMS
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold text-muted-foreground bg-muted border rounded px-1.5 py-0.5">
      {type}
    </span>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-emerald-600">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ── date helpers ── */
function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
