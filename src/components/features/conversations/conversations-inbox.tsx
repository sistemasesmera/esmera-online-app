"use client";

import {
  useState, useRef, useEffect, useTransition, useCallback,
} from "react";
import Link from "next/link";
import {
  MessageSquare, Search, Phone, Mail, User, GraduationCap,
  Send, Loader2, RefreshCw, Mic, Square,
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
  sendVoiceNote,
  fetchMoreConversations,
  markConversationRead,
  type MessageDisplay,
} from "@/app/(app)/conversaciones/actions";

type Props = {
  initialThreads: ConversationThread[];
  initialHasMore: boolean;
  initialStartAfter: number | null;
  initialStartAfterId: string | null;
};

export function ConversationsInbox({
  initialThreads,
  initialHasMore,
  initialStartAfter,
  initialStartAfterId,
}: Props) {
  const [threads, setThreads] = useState<ConversationThread[]>(initialThreads);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState({ startAfter: initialStartAfter, startAfterId: initialStartAfterId });
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(initialThreads[0]?.ghl_conversation_id ?? null);
  const [messagesCache, setMessagesCache] = useState<Record<string, MessageDisplay[]>>({});
  const [optimistic, setOptimistic] = useState<Record<string, MessageDisplay[]>>({});
  const [loadingMsgId, setLoadingMsgId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingMoreRef = useRef(false);
  const cursorRef = useRef(cursor);
  const searchRef = useRef(search);

  const active = threads.find((t) => t.ghl_conversation_id === selectedId) ?? null;
  const activeMessages = [
    ...(messagesCache[selectedId ?? ""] ?? []),
    ...(optimistic[selectedId ?? ""] ?? []),
  ];

  /* ── Búsqueda con debounce → llama GHL API ── */
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      searchRef.current = search;
      setIsSearching(true);
      const result = await fetchMoreConversations({ startAfter: null, startAfterId: null, query: search || undefined });
      setIsSearching(false);
      if (result.ok) {
        setThreads(result.threads);
        setHasMore(result.hasMore);
        const newCursor = { startAfter: result.startAfter, startAfterId: result.startAfterId };
        setCursor(newCursor);
        cursorRef.current = newCursor;
        setSelectedId(result.threads[0]?.ghl_conversation_id ?? null);
      }
    }, 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* ── Infinite scroll — observer se crea solo cuando hasMore cambia ── */
  useEffect(() => {
    const sentinel = scrollSentinelRef.current;
    if (!hasMore || !sentinel) return;

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);

      const result = await fetchMoreConversations({
        startAfter: cursorRef.current.startAfter,
        startAfterId: cursorRef.current.startAfterId,
        query: searchRef.current || undefined,
      });

      setLoadingMore(false);
      loadingMoreRef.current = false;

      if (result.ok && result.threads.length > 0) {
        setThreads((prev) => {
          const seen = new Set(prev.map((t) => t.ghl_conversation_id));
          return [...prev, ...result.threads.filter((t) => !seen.has(t.ghl_conversation_id))];
        });
        const newCursor = { startAfter: result.startAfter, startAfterId: result.startAfterId };
        setCursor(newCursor);
        cursorRef.current = newCursor;
        setHasMore(result.hasMore);
      } else {
        setHasMore(false);
      }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  // Solo recrear cuando hasMore cambia (true→false detiene el observer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore]);

  /* ── Carga de mensajes ── */
  const loadMessages = useCallback(async (convId: string, force = false) => {
    if (!force && messagesCache[convId]) return;
    setLoadingMsgId(convId);
    setLoadError(null);
    const result = await loadConversationMessages(convId);
    setLoadingMsgId(null);
    if (result.ok && result.messages) {
      setMessagesCache((prev) => ({ ...prev, [convId]: result.messages! }));
    } else {
      setLoadError(result.error ?? "Error cargando mensajes");
    }
  }, [messagesCache]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function addOptimistic(convId: string, msg: MessageDisplay) {
    setOptimistic((prev) => ({ ...prev, [convId]: [...(prev[convId] ?? []), msg] }));
  }

  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border card-shadow">
      {/* ── Left panel ── */}
      <div className="w-80 shrink-0 flex flex-col border-r bg-background">
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Buscar por nombre, teléfono…"
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <MessageSquare className="h-8 w-8 opacity-30" />
              {search ? "Sin resultados" : "Sin conversaciones"}
            </div>
          ) : (
            <>
              {threads.map((thread) => (
                <ThreadCard
                  key={thread.ghl_conversation_id}
                  thread={thread}
                  isActive={thread.ghl_conversation_id === selectedId}
                  onClick={() => {
                    setSelectedId(thread.ghl_conversation_id);
                    if (thread.unread_count > 0) {
                      setThreads((prev) => prev.map((t) =>
                        t.ghl_conversation_id === thread.ghl_conversation_id
                          ? { ...t, unread_count: 0 }
                          : t
                      ));
                      markConversationRead(thread.ghl_conversation_id);
                    }
                  }}
                />
              ))}
              {/* Infinite scroll sentinel */}
              <div ref={scrollSentinelRef} className="py-2 flex justify-center">
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!hasMore && threads.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">Fin de conversaciones</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      {active ? (
        <ThreadDetail
          thread={active}
          messages={activeMessages}
          isLoading={loadingMsgId === active.ghl_conversation_id}
          loadError={loadError}
          onRefresh={() => loadMessages(active.ghl_conversation_id, true)}
          onMessageSent={(msg) => addOptimistic(active.ghl_conversation_id, msg)}
          onAfterSend={(sentMsg) => {
            const convId = active.ghl_conversation_id;
            setMessagesCache((prev) => ({
              ...prev,
              [convId]: [...(prev[convId] ?? []), { ...sentMsg, id: `sent-${Date.now()}` }],
            }));
            setOptimistic((prev) => ({ ...prev, [convId]: [] }));
          }}
          onSendFailed={() => {
            const convId = active.ghl_conversation_id;
            setOptimistic((prev) => ({ ...prev, [convId]: [] }));
          }}
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
function ThreadCard({ thread, isActive, onClick }: {
  thread: ConversationThread; isActive: boolean; onClick: () => void;
}) {
  const displayName = thread.contact_name?.trim() || thread.contact_phone || "Desconocido";
  const initials = displayName.normalize("NFC").split(" ").slice(0, 2).map((w) => Array.from(w)[0]?.toUpperCase() ?? "").join("");

  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors border-b last:border-b-0",
      isActive ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/40 border-l-2 border-l-transparent",
    )}>
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
            <span suppressHydrationWarning className="text-[10px] text-muted-foreground">
              {thread.last_message_at ? formatTimeAgo(thread.last_message_at) : ""}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">{thread.last_message ?? "Sin mensajes"}</p>
        <div className="flex items-center gap-1 mt-1">
          {thread.lead_id && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-medium text-amber-600 border-amber-300">Lead</Badge>
          )}
          {thread.student_id && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-medium text-indigo-600 border-indigo-300">Alumno</Badge>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Thread detail ── */
function ThreadDetail({ thread, messages, isLoading, loadError, onRefresh, onMessageSent, onAfterSend, onSendFailed }: {
  thread: ConversationThread;
  messages: MessageDisplay[];
  isLoading: boolean;
  loadError: string | null;
  onRefresh: () => void;
  onMessageSent: (msg: MessageDisplay) => void;
  onAfterSend: (sentMsg: MessageDisplay) => void;
  onSendFailed: () => void;
}) {
  const displayName = thread.contact_name?.trim() || thread.contact_phone || "Desconocido";
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startRecording() {
    setSendError(null);
    // GHL solo acepta audio/mp4 o audio/mpeg — WebM y OGG son rechazados con 415
    const mimeType =
      MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2") ? "audio/mp4;codecs=mp4a.40.2" :
      MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" :
      null;

    if (!mimeType) {
      setSendError("Tu navegador no soporta grabación de voz compatible. Usa Chrome 90+ o Safari.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelledRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleSendVoice(blob, mimeType);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setSendError("No se pudo acceder al micrófono");
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function cancelRecording() {
    cancelledRef.current = true;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleSendVoice(blob: Blob, mimeType: string) {
    const optimisticMsg: MessageDisplay = {
      id: `opt-${Date.now()}`,
      body: "🎤 Nota de voz",
      direction: "outbound",
      dateAdded: new Date().toISOString(),
      attachments: [],
      mediaType: "audio",
    };
    onMessageSent(optimisticMsg);

    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
    const formData = new FormData();
    formData.append("ghlContactId", thread.ghl_contact_id);
    formData.append("contactPhone", thread.contact_phone ?? "");
    formData.append("conversationId", thread.ghl_conversation_id);
    formData.append("audio", new File([blob], `voice-note.${ext}`, { type: mimeType }));

    const result = await sendVoiceNote(formData);
    if (!result.ok) {
      setSendError(result.error ?? "Error enviando nota de voz");
      onSendFailed();
    } else {
      onAfterSend(optimisticMsg);
    }
  }

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
      if (!result.ok) {
        setSendError(result.error ?? "Error al enviar");
        onSendFailed();
      } else {
        onAfterSend(optimisticMsg);
      }
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
          <div className="flex items-center gap-2"><span className="font-semibold text-sm">{displayName}</span></div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            {thread.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{thread.contact_phone}</span>}
            {thread.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{thread.contact_email}</span>}
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
            <Loader2 className="h-4 w-4 animate-spin" />Cargando mensajes…
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-sm">
            <p className="text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={onRefresh}>Reintentar</Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin mensajes</div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t bg-background px-4 py-3">
        {sendError && <p className="text-xs text-destructive mb-2">⚠ {sendError}</p>}
        {recording ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-sm text-red-600 font-medium">Grabando…</span>
              <span className="text-sm text-red-500 font-mono ml-auto">{formatRecordingTime(recordingSeconds)}</span>
            </div>
            <Button size="icon" variant="ghost" onClick={cancelRecording} className="h-10 w-10 shrink-0 text-muted-foreground">
              ✕
            </Button>
            <Button size="icon" onClick={stopRecording} className="h-10 w-10 shrink-0 bg-red-500 hover:bg-red-600">
              <Square className="h-4 w-4 fill-white text-white" />
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Escribe un mensaje… (Enter envía, Shift+Enter nueva línea)"
              className="flex-1 min-h-[42px] max-h-32 resize-none text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={isPending}
            />
            <Button size="icon" variant="outline" onClick={startRecording} disabled={isPending} className="h-10 w-10 shrink-0" title="Grabar nota de voz">
              <Mic className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={handleSend} disabled={!draft.trim() || isPending} className="h-10 w-10 shrink-0">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
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
        isInbound ? "bg-white border text-foreground rounded-tl-sm" : "bg-primary text-white rounded-tr-sm",
        isOptimistic && "opacity-70",
      )}>
        {message.attachments.length > 0 && (
          <MediaAttachment attachments={message.attachments} mediaType={message.mediaType} isInbound={isInbound} />
        )}
        {message.mediaType === "text" ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
        ) : message.attachments.length === 0 ? (
          <p className="italic opacity-80">{message.body}</p>
        ) : null}
        <p className={cn("text-[10px] mt-1 text-right", isInbound ? "text-muted-foreground" : "text-white/70")}>
          {formatDateTime(message.dateAdded)}{isOptimistic && " · enviando…"}
        </p>
      </div>
    </div>
  );
}

/* ── Media attachment ── */
function MediaAttachment({ attachments, mediaType, isInbound }: {
  attachments: string[]; mediaType: MessageDisplay["mediaType"]; isInbound: boolean;
}) {
  return (
    <div className="mb-2 space-y-1">
      {attachments.map((url, i) => {
        if (mediaType === "audio") return (
          <audio key={i} controls className="max-w-full h-10 rounded">
            <source src={url} />
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-xs">🎤 Escuchar nota de voz</a>
          </audio>
        );
        if (mediaType === "image") return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Imagen" className="max-w-full max-h-48 rounded-lg object-cover" />
          </a>
        );
        if (mediaType === "video") return (
          <video key={i} controls className="max-w-full max-h-48 rounded-lg"><source src={url} /></video>
        );
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            className={cn("flex items-center gap-1.5 text-xs underline font-medium", isInbound ? "text-primary" : "text-white")}>
            📄 Descargar documento
          </a>
        );
      })}
    </div>
  );
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

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
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
