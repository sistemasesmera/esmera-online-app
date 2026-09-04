"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, UserPlus, XCircle, RotateCcw, Phone, Mail, BookOpen, Calendar, Clock } from "lucide-react";

import { updateOpportunityStatus } from "@/app/(app)/crm/opportunities/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.744a.5.5 0 0 0 .617.608l6.09-1.595A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 0 1-5.032-1.385l-.36-.214-3.733.978.995-3.63-.235-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
    </svg>
  );
}

function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://web.whatsapp.com/send?phone=${digits}`;
}
import type { GhlOpportunityEnriched, GhlPipelineStage } from "@/lib/data/ghl-opportunities.repository";

export const STATUS_LABELS: Record<string, string> = {
  open: "Abierta", won: "Ganada", lost: "Perdida", abandoned: "Abandonada",
};

export const STATUS_COLORS: Record<string, string> = {
  open:      "bg-blue-500/10 text-blue-600 border-blue-200",
  won:       "bg-green-500/10 text-green-700 border-green-200",
  lost:      "bg-red-500/10 text-red-700 border-red-200",
  abandoned: "bg-gray-500/10 text-gray-600 border-gray-200",
};

function fmt(value: number | null): string {
  if (value == null) return "";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function OpportunityCard({
  opp,
  canEdit,
  onEnroll,
  dragHandleProps,
  isDragOverlay = false,
}: {
  opp: GhlOpportunityEnriched;
  allStages?: GhlPipelineStage[];
  canEdit: boolean;
  onEnroll?: (opp: GhlOpportunityEnriched) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragOverlay?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleLost() {
    startTransition(async () => {
      const res = await updateOpportunityStatus(opp.id, "lost", { contactName: opp.contact.name, fromStatus: opp.status });
      if (!res.success) toast.error(res.error ?? "Error");
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const res = await updateOpportunityStatus(opp.id, "open", { contactName: opp.contact.name, fromStatus: opp.status });
      if (!res.success) toast.error(res.error ?? "Error al reabrir");
    });
  }

  const isOpen = opp.status === "open";
  const isTerminal = opp.status === "won" || opp.status === "lost";

  return (
    <div
      className={`rounded-xl border bg-card transition-shadow select-none ${
        isDragOverlay
          ? "shadow-2xl rotate-1 scale-105 opacity-95"
          : "shadow-sm hover:shadow-md"
      } ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Drag handle — pill centrado en la parte superior */}
      {canEdit && !isDragOverlay && (
        <div
          {...dragHandleProps}
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-8 h-1 rounded-full bg-border/60 group-hover:bg-border transition-colors" />
        </div>
      )}

      {/* Cuerpo principal */}
      <div className={`px-3 space-y-2 ${canEdit && !isDragOverlay ? "pt-0 pb-3" : "pt-3 pb-3"}`}>

        {/* Nombre + badge de estado + valor */}
        <div>
          <div className="flex items-start justify-between gap-2 min-w-0">
            <p className="font-semibold text-sm leading-snug truncate">{opp.contact.name}</p>
            <div className="flex items-center gap-1 shrink-0">
              {opp.status !== "open" && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 leading-4 ${STATUS_COLORS[opp.status]}`}>
                  {STATUS_LABELS[opp.status]}
                </Badge>
              )}
              {opp.contact.phone && !isDragOverlay && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={whatsappUrl(opp.contact.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 hover:text-green-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="top">Enviar WhatsApp</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          {!!opp.monetaryValue && (
            <p className="text-sm font-bold text-primary mt-0.5">{fmt(opp.monetaryValue)}</p>
          )}
        </div>

        {/* Contacto: teléfono + email */}
        {(opp.contact.phone || opp.contact.email) && (
          <div className="space-y-0.5">
            {opp.contact.phone && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{opp.contact.phone}</span>
              </p>
            )}
            {opp.contact.email && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{opp.contact.email}</span>
              </p>
            )}
          </div>
        )}

        {/* Curso — chip indigo */}
        {opp.cursoValue && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-full px-2 py-0.5 max-w-full">
            <BookOpen className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{opp.cursoValue}</span>
          </span>
        )}

        {/* Fechas */}
        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5 shrink-0" />
            {fmtDate(opp.createdAt)}
          </span>
          {opp.updatedAt !== opp.createdAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 shrink-0" />
              {fmtDate(opp.updatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Barra de acciones */}
      {!isDragOverlay && (
        <TooltipProvider>
          <div className="flex items-center justify-between gap-1 px-2 pb-2 pt-1.5 border-t border-border/40">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0" asChild>
                  <Link href={`/crm/opportunities/${opp.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Ver detalle</TooltipContent>
            </Tooltip>


            <div className="flex items-center gap-1">
              {canEdit && isOpen && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                        disabled={isPending}
                        onClick={() => onEnroll?.(opp)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Matricular
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Crear matrícula y marcar como ganado</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
                        disabled={isPending}
                        onClick={handleLost}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Marcar como perdido</TooltipContent>
                  </Tooltip>
                </>
              )}
              {canEdit && isTerminal && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={isPending} onClick={handleReopen}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reabrir
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Volver a estado abierto</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
