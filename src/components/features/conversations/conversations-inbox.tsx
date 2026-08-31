"use client";

import { useState, useMemo, useRef, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare, Search, Phone, Mail, User, GraduationCap,
  Send, Loader2, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ConversationThread } from "@/lib/data/ghl-conversations.repository";
import {
  loadConversationMessages,
  sendConversationMessage,
  type MessageDisplay,
} from "@/app/(app)/conversaciones/actions";

type Props = { threads: ConversationThread[] };

export function ConversationsInbox({ threads }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    threads[0]?.ghl_conversation_id ?? null,
  );
  const [search, setSearch] = useState("");
  const [messagesCache, setMessagesCache] = useState<Record<string, MessageDisplay[]>>({});
  const [optimistic, setOptimistic] = useState<Record<string, MessageDisplay[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.contact_name?.toLowerCase().includes(q) ||
        t.contact_phone?.includes(q) ||
        t.last_message?.toLowerCase().includes(q),
    );
  }, [threads, search]);

  const active = threads.find((t) => t.ghl_conversation_id === selectedId) ?? null;

  const activeMessages = useMemo(() => {
    if (!selectedId) return [];
    const cached = messagesCache[selectedId] ?? [];
    const extra = optimistic[selectedId] ?? [];
    return [...cached, ...extra];
  }, [selectedId, messagesCache, optimistic]);

  const loadMessages = useCallback(
    async (convId: string, force = false) => {
      if (!force && messagesCache[convId]) return;
      setLoadingId(convId);
      setLoadError(null);
      const result = await loadConversationMessages(convId);
      setLoadingId(null);
      if (result.ok && result.messages) {
        setMessagesCache((prev) => ({ ...prev, [convId]: result.messages! }));
      } else {
        setLoadError(result.error ?? "Error cargando mensajes");
      }
    },
    [messagesCache],
  );

  // Auto-load when conversation selected
  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Auto-load first conversation on mount
  useEffect(() => {
    if (threads[0]) {
      setSelectedId(threads[0].ghl_conversation_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addOptimistic(convId: string, msg: MessageDisplay) {
    setOptimistic((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] ?? []), msg],
    }));
  }

  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border card-shadow">
      {/* ── Left panel ── */}
      <div className="w-80 shrink-0 flex flex-col border-r bg-background">
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

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <MessageSquare className="h-8 w-8 opacity-30" />
              {threads.length === 0 ? "Sin conversaciones aún" : "Sin resultados"}
            </div>
          ) : (
            filtered.map((thread) => (
              <ThreadCard
                key={thread.ghl_conversation_id}
                thread={thread}
                isActive={thread.ghl_conversation_id === selectedId}
                onClick={() => setSelectedId(thread.ghl_conversation_id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      {active ? (
        <ThreadDetail
          thread={active}
          messages={activeMessages}
          isLoading={loadingId === active.ghl_conversation_id}
          loadError={loadError}
          onRefresh={() => loadMessages(active.ghl_conversation_id, true)}
          onMessageSent={(msg) => addOptimistic(active.ghl_conversation_id, msg)}
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

/* ── Thread card ── */
function ThreadCard({
  thread, isActive, onClick,
}: {
  thread: ConversationThread;
  isActive: boolean;
  onClick: () => void;
}) {
  const displayName = thread.contact_name ?? thread.contact_phone ?? "Desconocido";
  const initials = displayName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

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
          <div className="flex items-center gap-1 shrink-0">
            {thread.unread_count > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                {thread.unread_count}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {thread.last_message_at ? formatTimeAgo(thread.last_message_at) : ""}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {thread.last_message ?? "Sin mensajes"}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <WhatsAppBadge />
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

/* ── Thread detail ── */
function ThreadDetail({
  thread, messages, isLoading, loadError, onRefresh, onMessageSent,
}: {
  thread: ConversationThread;
  messages: MessageDisplay[];
  isLoading: boolean;
  loadError: string | null;
  onRefresh: () => void;
  onMessageSent: (msg: MessageDisplay) => void;
}) {
  const displayName = thread.contact_name ?? thread.contact_phone ?? "Desconocido";
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = draft.trim();
    if (!text || isPending) return;
    setDraft("");
    setSendError(null);

    const optimisticMsg: MessageDisplay = {
      id: `opt-${Date.now()}`,
      body: text,
      direction: "outbound",
      dateAdded: new Date().toISOString(),
      attachments: [],
      mediaType: "text",
    };
    onMessageSent(optimisticMsg);

    startTransition(async () => {
      const result = await sendConversationMessage(thread.ghl_contact_id, thread.contact_phone, text);
      if (!result.ok) setSendError(result.error ?? "Error al enviar");
    });
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-background">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm shrink-0">
          {displayName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || <MessageSquare className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{displayName}</span>
            <WhatsAppBadge />
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            {thread.contact_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />{thread.contact_phone}
              </span>
            )}
            {thread.contact_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />{thread.contact_email}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh} title="Actualizar">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {thread.lead_id && (
            <Link href={`/crm/leads/${thread.lead_id}`} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-200 rounded px-2 py-1 hover:bg-amber-50 transition-colors">
              <User className="h-3 w-3" />Ver Lead
            </Link>
          )}
          {thread.student_id && (
            <Link href={`/students/${thread.student_id}`} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-50 transition-colors">
              <GraduationCap className="h-3 w-3" />Ver Alumno
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-muted/10">
        {isLoading ? (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando mensajes…
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-sm">
            <p className="text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={onRefresh}>Reintentar</Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Sin mensajes
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t bg-background px-4 py-3">
        {sendError && (
          <p className="text-xs text-destructive mb-2">⚠ {sendError}</p>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
            className="flex-1 min-h-[42px] max-h-32 resize-none text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            disabled={isPending}
          />
          <Button size="icon" onClick={handleSend} disabled={!draft.trim() || isPending} className="h-10 w-10 shrink-0">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Message bubble ── */
function MessageBubble({ message }: { message: MessageDisplay }) {
  const isInbound = message.direction === "inbound";
  const isOptimistic = message.id.startsWith("opt-");

  return (
    <div className={cn("flex", isInbound ? "justify-start" : "justify-end")}>
      <div className={cn(
        "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
        isInbound ? "bg-white border text-foreground rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm",
        isOptimistic && "opacity-70",
      )}>
        {/* Media */}
        {message.attachments.length > 0 && (
          <MediaAttachment attachments={message.attachments} mediaType={message.mediaType} isInbound={isInbound} />
        )}

        {/* Text body */}
        {message.mediaType === "text" ? (
          <p className={cn("whitespace-pre-wrap break-words leading-relaxed", !isInbound && "text-white")}>{message.body}</p>
        ) : message.attachments.length === 0 ? (
          <p className={cn("italic opacity-80", !isInbound && "text-white")}>{message.body}</p>
        ) : null}

        <p className={cn("text-[10px] mt-1 text-right", isInbound ? "text-muted-foreground" : "text-primary-foreground/70")}>
          {formatDateTime(message.dateAdded)}
          {isOptimistic && " · enviando…"}
        </p>
      </div>
    </div>
  );
}

/* ── Media attachment renderer ── */
function MediaAttachment({
  attachments, mediaType, isInbound,
}: {
  attachments: string[];
  mediaType: MessageDisplay["mediaType"];
  isInbound: boolean;
}) {
  return (
    <div className="mb-2 space-y-1">
      {attachments.map((url, i) => {
        if (mediaType === "audio") {
          return (
            <audio key={i} controls className="max-w-full h-10 rounded">
              <source src={url} />
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-xs">
                🎤 Escuchar nota de voz
              </a>
            </audio>
          );
        }
        if (mediaType === "image") {
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Imagen" className="max-w-full max-h-48 rounded-lg object-cover" />
            </a>
          );
        }
        if (mediaType === "video") {
          return (
            <video key={i} controls className="max-w-full max-h-48 rounded-lg">
              <source src={url} />
            </video>
          );
        }
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            className={cn("flex items-center gap-1.5 text-xs underline font-medium",
              isInbound ? "text-primary" : "text-primary-foreground"
            )}>
            📄 Descargar documento
          </a>
        );
      })}
    </div>
  );
}

/* ── WhatsApp badge ── */
function WhatsAppBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-emerald-600">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      WA
    </span>
  );
}

/* ── Date helpers ── */
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
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}
