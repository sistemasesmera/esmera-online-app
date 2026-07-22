"use client";

import {
  Mail,
  MessageCircle,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  StickyNote,
  Users,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { addLeadInteraction } from "@/app/(app)/crm/leads/[id]/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { LeadInteractionRow } from "@/lib/data/lead-interactions.repository";
import type { LeadContactType } from "@/types/database.types";

const CONTACT_TYPE_LABELS: Record<LeadContactType, string> = {
  llamada_saliente: "Llamada saliente",
  llamada_entrante: "Llamada entrante",
  no_contesta:      "No contestó",
  email:            "Email",
  whatsapp:         "WhatsApp",
  reunion:          "Reunión",
  otro:             "Nota",
};

const CONTACT_TYPE_ICONS: Record<LeadContactType, React.ElementType> = {
  llamada_saliente: PhoneOutgoing,
  llamada_entrante: PhoneIncoming,
  no_contesta:      PhoneMissed,
  email:            Mail,
  whatsapp:         MessageCircle,
  reunion:          Users,
  otro:             StickyNote,
};

const CONTACT_TYPE_COLORS: Record<LeadContactType, string> = {
  llamada_saliente: "bg-blue-100 text-blue-700",
  llamada_entrante: "bg-green-100 text-green-700",
  no_contesta:      "bg-amber-100 text-amber-700",
  email:            "bg-purple-100 text-purple-700",
  whatsapp:         "bg-emerald-100 text-emerald-700",
  reunion:          "bg-orange-100 text-orange-700",
  otro:             "bg-gray-100 text-gray-600",
};

const QUICK_TYPES: { type: LeadContactType; label: string }[] = [
  { type: "llamada_saliente", label: "Llamada" },
  { type: "no_contesta",      label: "No contestó" },
  { type: "whatsapp",         label: "WhatsApp" },
  { type: "email",            label: "Email" },
  { type: "otro",             label: "Nota" },
];

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const d2 = new Date(dateStr + "T00:00:00");
    return d2.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  }
  const hasTime = dateStr.includes("T") || dateStr.includes(" ");
  if (hasTime) {
    return d.toLocaleString("es-ES", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function LeadInteractionsTimeline({
  leadId,
  initialInteractions,
  currentUserName,
  canAdd,
  onStatusChange,
}: {
  leadId: string;
  initialInteractions: LeadInteractionRow[];
  currentUserName: string;
  canAdd: boolean;
  onStatusChange?: (newStatus: "en_contacto") => void;
}) {
  const [interactions, setInteractions] = useState(initialInteractions);
  const [activeType, setActiveType] = useState<LeadContactType>("llamada_saliente");
  const [noteText, setNoteText] = useState("");
  const [isSaving, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isNoContesta = activeType === "no_contesta";
  const placeholder = isNoContesta
    ? "Añade contexto opcional… (Ctrl+Enter para guardar)"
    : "Escribe una nota… (Ctrl+Enter para guardar)";

  function handleSave() {
    const resolvedNotes = noteText.trim() || (isNoContesta ? "No contestó" : "");
    if (!resolvedNotes) return;

    startTransition(async () => {
      const today = new Date().toISOString().split("T")[0];
      const result = await addLeadInteraction(leadId, {
        contact_type: activeType,
        notes: resolvedNotes,
        followup_date: today,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(CONTACT_TYPE_LABELS[activeType] + " registrado");
        setNoteText("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        if (result.data) {
          setInteractions((prev) => [result.data as LeadInteractionRow, ...prev]);
        }
        if (result.statusUpdated) {
          onStatusChange?.("en_contacto");
        }
      }
    });
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNoteText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  const canSubmit = isNoContesta || noteText.trim().length > 0;

  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">Notas y seguimiento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">

        {canAdd && (
          <div className="flex flex-col gap-2">
            {/* Type selector */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TYPES.map(({ type, label }) => {
                const Icon = CONTACT_TYPE_ICONS[type];
                const isActive = activeType === type;
                const colors = CONTACT_TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveType(type)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                      isActive
                        ? `${colors} border-current shadow-sm`
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Note textarea */}
            <Textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={noteText}
              onChange={autoResize}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (canSubmit) handleSave();
                }
              }}
              rows={2}
              className="resize-none text-sm"
              disabled={isSaving}
            />

            {canSubmit && (
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Guardando…" : `Guardar ${CONTACT_TYPE_LABELS[activeType].toLowerCase()}`}
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
            const isSystem = (item.contact_type as string) === "nota_interna";
            const type = item.contact_type as LeadContactType;
            const Icon = CONTACT_TYPE_ICONS[type] ?? StickyNote;
            const colors = CONTACT_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-600";
            return (
              <div key={item.id} className="flex gap-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {isSystem ? "Nota" : (CONTACT_TYPE_LABELS[type] ?? type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.created_at)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {isSystem ? "Sistema" : (item.users?.full_name ?? currentUserName)}
                    </span>
                  </div>
                  {item.notes && item.notes !== "No contestó" && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {item.notes}
                    </p>
                  )}
                  {item.contact_type !== "otro" && item.next_followup_date && (
                    <p className="text-xs text-blue-600 mt-1">
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
