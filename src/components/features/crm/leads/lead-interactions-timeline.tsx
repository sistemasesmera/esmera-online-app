"use client";

import {
  Mail,
  MessageCircle,
  PhoneIncoming,
  PhoneOutgoing,
  Users,
  StickyNote,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { addQuickNote } from "@/app/(app)/crm/leads/[id]/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { LeadInteractionRow } from "@/lib/data/lead-interactions.repository";
import type { LeadContactType } from "@/types/database.types";

const CONTACT_TYPE_LABELS: Record<LeadContactType, string> = {
  llamada_saliente: "Llamada saliente",
  llamada_entrante: "Llamada entrante",
  email: "Email",
  whatsapp: "WhatsApp",
  reunion: "Reunión",
  otro: "Nota",
};

const CONTACT_TYPE_ICONS: Record<LeadContactType, React.ElementType> = {
  llamada_saliente: PhoneOutgoing,
  llamada_entrante: PhoneIncoming,
  email: Mail,
  whatsapp: MessageCircle,
  reunion: Users,
  otro: StickyNote,
};

const CONTACT_TYPE_COLORS: Record<LeadContactType, string> = {
  llamada_saliente: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  llamada_entrante: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  email: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  whatsapp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  reunion: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  otro: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const d2 = new Date(dateStr + "T00:00:00");
    return d2.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  }
  const hasTime = dateStr.includes("T") || dateStr.includes(" ");
  if (hasTime) {
    return d.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function LeadInteractionsTimeline({
  leadId,
  initialInteractions,
  currentUserName,
  canAdd,
}: {
  leadId: string;
  initialInteractions: LeadInteractionRow[];
  currentUserName: string;
  canAdd: boolean;
}) {
  const [interactions, setInteractions] = useState(initialInteractions);
  const [quickNote, setQuickNote] = useState("");
  const [isSavingNote, startNoteTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleQuickNote() {
    const text = quickNote.trim();
    if (!text) return;
    startNoteTransition(async () => {
      const result = await addQuickNote(leadId, text);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Nota guardada");
        setQuickNote("");
        if (result.data) {
          setInteractions((prev) => [result.data as LeadInteractionRow, ...prev]);
        }
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
    });
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setQuickNote(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">Notas y seguimiento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Quick note input */}
        {canAdd && (
          <div className="flex flex-col gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Escribe una nota… (Ctrl+Enter para guardar)"
              value={quickNote}
              onChange={autoResize}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleQuickNote();
                }
              }}
              rows={2}
              className="resize-none text-sm"
              disabled={isSavingNote}
            />
            {quickNote.trim() && (
              <div className="flex justify-end">
                <Button size="sm" onClick={handleQuickNote} disabled={isSavingNote}>
                  {isSavingNote ? "Guardando…" : "Guardar nota"}
                </Button>
              </div>
            )}
          </div>
        )}

        {interactions.length > 0 && canAdd && <div className="border-t" />}

        {interactions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sin notas ni contactos registrados aún.
          </p>
        )}

        <div className="space-y-4">
          {interactions.map((item) => {
            const Icon = CONTACT_TYPE_ICONS[item.contact_type];
            const isNote = item.contact_type === "otro";
            return (
              <div key={item.id} className="flex gap-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${CONTACT_TYPE_COLORS[item.contact_type]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {CONTACT_TYPE_LABELS[item.contact_type]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.created_at)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {item.users?.full_name ?? currentUserName}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {item.notes}
                  </p>
                  {!isNote && item.next_followup_date && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Próximo contacto: {formatDateTime(item.next_followup_date)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
