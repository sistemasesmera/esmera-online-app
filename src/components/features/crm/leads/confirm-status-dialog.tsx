"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LEAD_STATUS_LABELS } from "@/lib/domain/leads/schema";
import type { LeadStatus } from "@/types/database.types";

const STATUS_CLS: Partial<Record<LeadStatus, string>> = {
  contactado:  "text-blue-700 bg-blue-50 border border-blue-200",
  cualificado: "text-violet-700 bg-violet-50 border border-violet-200",
  descartado:  "text-red-700 bg-red-50 border border-red-200",
  nuevo:       "text-slate-700 bg-slate-50 border border-slate-200",
};

export function ConfirmStatusDialog({
  open,
  fromStatus,
  toStatus,
  leadName,
  isPending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  fromStatus: LeadStatus;
  toStatus: LeadStatus | null;
  leadName: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!toStatus) return null;

  const isDestructive = toStatus === "descartado";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar cambio de estado</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro que quieres cambiar el estado de este lead?
          </p>

          {/* Lead name */}
          <p className="text-sm font-semibold text-foreground truncate">{leadName}</p>

          {/* From → To */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_CLS[fromStatus] ?? "bg-muted text-muted-foreground"}`}>
              {LEAD_STATUS_LABELS[fromStatus]}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_CLS[toStatus] ?? "bg-muted text-muted-foreground"}`}>
              {LEAD_STATUS_LABELS[toStatus]}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Guardando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
