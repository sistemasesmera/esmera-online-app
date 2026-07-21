"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { discardLead } from "@/app/(app)/crm/leads/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DISCARD_REASONS,
  DISCARD_REASON_LABELS,
  type DiscardReason,
} from "@/lib/domain/leads/schema";

export function DiscardLeadDialog({
  open,
  leadId,
  leadName,
  onSuccess,
  onCancel,
}: {
  open: boolean;
  leadId: string;
  leadName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<DiscardReason | "">("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!reason) return;
    startTransition(async () => {
      const result = await discardLead(leadId, reason, notes);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Lead descartado");
        setReason("");
        setNotes("");
        onSuccess();
      }
    });
  }

  function handleOpenChange(v: boolean) {
    if (!v && !isPending) {
      setReason("");
      setNotes("");
      onCancel();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Descartar lead</DialogTitle>
        </DialogHeader>

        <div className="py-1 space-y-4">
          <p className="text-sm text-muted-foreground truncate">
            <span className="font-semibold text-foreground">{leadName}</span>
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Motivo del descarte <span className="text-destructive">*</span>
            </p>
            <div className="flex flex-col gap-2">
              {DISCARD_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    reason === r
                      ? "border-destructive/60 bg-destructive/5 text-foreground"
                      : "border-border hover:bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="discard_reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => { setReason(r); if (r !== "otro") setNotes(""); }}
                    className="accent-destructive"
                  />
                  {DISCARD_REASON_LABELS[r]}
                </label>
              ))}
            </div>
          </div>

          {reason === "otro" && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Especifica el motivo
              </p>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                placeholder="Describe el motivo…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!reason || (reason === "otro" && !notes.trim()) || isPending}
            onClick={handleConfirm}
          >
            {isPending ? "Guardando…" : "Descartar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
