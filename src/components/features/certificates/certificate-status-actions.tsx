"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateCertificateStatus } from "@/app/(app)/certificates/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CertificateWithJoins } from "@/lib/data/certificates.repository";
import { CERT_STATUS_TRANSITIONS } from "@/lib/domain/certificates/schema";
import type { CertificateStatus } from "@/types/database.types";

export function CertificateStatusActions({ certificate }: { certificate: CertificateWithJoins }) {
  const [emitDialogOpen, setEmitDialogOpen] = useState(false);
  const [docUrl, setDocUrl] = useState(certificate.document_url ?? "");
  const [isPending, startTransition] = useTransition();

  const nextStatuses = CERT_STATUS_TRANSITIONS[certificate.status];
  if (nextStatuses.length === 0) return null;

  function cancel() {
    startTransition(async () => {
      const result = await updateCertificateStatus(certificate.id, "anulado");
      if (result.error) toast.error(result.error);
      else toast.success("Certificado anulado");
    });
  }

  function emit() {
    startTransition(async () => {
      const result = await updateCertificateStatus(certificate.id, "emitido", docUrl || undefined);
      if (result.error) toast.error(result.error);
      else { toast.success("Certificado emitido"); setEmitDialogOpen(false); }
    });
  }

  return (
    <>
      <div className="flex gap-1 flex-wrap">
        {nextStatuses.includes("emitido") && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setEmitDialogOpen(true)}>
            Emitir
          </Button>
        )}
        {nextStatuses.includes("anulado") && (
          <Button size="sm" variant="destructive" disabled={isPending} onClick={cancel}>
            Anular
          </Button>
        )}
      </div>

      <Dialog open={emitDialogOpen} onOpenChange={setEmitDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Emitir certificado</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-url">URL del documento (opcional)</Label>
              <Input
                id="doc-url"
                type="url"
                placeholder="https://…"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmitDialogOpen(false)} disabled={isPending}>Cancelar</Button>
              <Button onClick={emit} disabled={isPending}>
                {isPending ? "Emitiendo…" : "Confirmar emisión"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
