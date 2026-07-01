"use client";

import { ExternalLink, Plus, FileCheck2, FileText, ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateEnrollmentStatus, signContractForEnrollment } from "@/app/(app)/enrollments/actions";
import { CertificateForm } from "@/components/features/certificates/certificate-form";
import { CertificateStatusActions } from "@/components/features/certificates/certificate-status-actions";
import { AttachmentsTab } from "@/components/features/students/attachments-tab";
import { FollowupForm } from "@/components/features/tutoring/followup-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AttachmentWithUrl } from "@/lib/data/attachments.shared";
import type { CertificateWithJoins } from "@/lib/data/certificates.repository";
import type { EnrollmentWithCourse } from "@/lib/data/enrollments.repository";
import type { FollowupForStudent } from "@/lib/data/followups.repository";
import type { StudentRow } from "@/lib/data/students.repository";
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_TRANSITIONS,
  getTransitionLabel,
} from "@/lib/domain/enrollments/schema";
import { CONTACT_TYPE_LABELS, FOLLOWUP_STATUS_LABELS } from "@/lib/domain/followups/schema";
import type { CertificateStatus, ContractStatus, EnrollmentStatus } from "@/types/database.types";

const ENROLLMENT_STATUS_VARIANT: Record<EnrollmentStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  validada: "bg-blue-100 text-blue-700 border border-blue-200",
  activa: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  finalizada: "bg-slate-100 text-slate-600 border border-slate-200",
  cancelada: "bg-red-100 text-red-700 border border-red-200",
};

const CONTRACT_STATUS_VARIANT: Record<ContractStatus, string> = {
  borrador: "bg-slate-100 text-slate-600 border border-slate-200",
  enviado: "bg-blue-100 text-blue-700 border border-blue-200",
  firmado: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  anulado: "bg-red-100 text-red-700 border border-red-200",
};

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  firmado: "Firmado",
  anulado: "Anulado",
};

const CERT_STATUS_VARIANT: Record<CertificateStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  emitido: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  anulado: "bg-red-100 text-red-700 border border-red-200",
};

const CERT_STATUS_LABELS: Record<CertificateStatus, string> = {
  pendiente: "Pendiente",
  emitido: "Emitido",
  anulado: "Anulado",
};

export function EnrollmentManageDialog({
  open,
  onClose,
  enrollment,
  student,
  followups,
  certificate,
  attachments,
  canEdit,
  canFollowup,
}: {
  open: boolean;
  onClose: () => void;
  enrollment: EnrollmentWithCourse;
  student: StudentRow;
  followups: FollowupForStudent[];
  certificate: CertificateWithJoins | undefined;
  attachments: AttachmentWithUrl[];
  canEdit: boolean;
  canFollowup: boolean;
}) {
  const [addFollowupOpen, setAddFollowupOpen] = useState(false);
  const [addCertOpen, setAddCertOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [isPendingStatus, startStatusTransition] = useTransition();
  const [isPendingSign, startSignTransition] = useTransition();

  const courseName = enrollment.courses?.name ?? "—";
  const contract = enrollment.contracts?.[0];
  const nextStatuses = ENROLLMENT_STATUS_TRANSITIONS[enrollment.status];

  function handleStatusChange(next: EnrollmentStatus) {
    startStatusTransition(async () => {
      const result = await updateEnrollmentStatus(enrollment.id, next);
      if (result.error) toast.error(result.error);
      else toast.success(`Estado actualizado a "${ENROLLMENT_STATUS_LABELS[next]}"`);
    });
  }

  function handleSign() {
    if (!docUrl.trim()) return;
    startSignTransition(async () => {
      const result = await signContractForEnrollment(enrollment.id, docUrl.trim());
      if (result.error) toast.error(result.error);
      else {
        toast.success("Contrato marcado como firmado");
        setSignOpen(false);
        setDocUrl("");
      }
    });
  }

  const enrollmentForFollowup = [{
    id: enrollment.id,
    students: { full_name: student.full_name },
    courses: enrollment.courses,
  }];

  const enrollmentForCert = [{
    id: enrollment.id,
    students: { full_name: student.full_name },
    courses: enrollment.courses,
  }];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{courseName}</DialogTitle>
          <p className="text-sm text-muted-foreground">{student.full_name}</p>
        </DialogHeader>

        {/* ── Summary strip ── */}
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          {/* Row 1: status + transitions */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`text-xs font-semibold ${ENROLLMENT_STATUS_VARIANT[enrollment.status]}`}>
              {ENROLLMENT_STATUS_LABELS[enrollment.status]}
            </Badge>
            {canEdit && nextStatuses.map((next) => (
              <button
                key={next}
                onClick={() => handleStatusChange(next as EnrollmentStatus)}
                disabled={isPendingStatus}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ring-1 ${
                  next === "cancelada"
                    ? "text-red-700 bg-red-50 ring-red-200 hover:bg-red-100"
                    : "text-primary bg-primary/8 ring-primary/20 hover:bg-primary/15 hover:ring-primary/40"
                }`}
              >
                <ArrowRight className="h-3 w-3" />
                {getTransitionLabel(enrollment.status, next as EnrollmentStatus)}
              </button>
            ))}
          </div>

          {/* Row 2: meta */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {enrollment.platforms?.name && (
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">Plataforma:</span>{" "}
                {enrollment.platforms.name}
              </span>
            )}
            {enrollment.tutors?.users?.full_name && (
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">Tutor:</span>{" "}
                {enrollment.tutors.users.full_name}
              </span>
            )}
            {enrollment.enrollment_date && (
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">Fecha:</span>{" "}
                {new Date(enrollment.enrollment_date + "T00:00:00").toLocaleDateString("es-ES")}
              </span>
            )}
          </div>

          {/* Row 3: contract */}
          {contract && (
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contrato</span>
              <Badge className={`text-xs font-semibold ${CONTRACT_STATUS_VARIANT[contract.status]}`}>
                {contract.status === "firmado"
                  ? <FileCheck2 className="mr-1 h-3 w-3 inline" />
                  : <FileText className="mr-1 h-3 w-3 inline" />}
                {CONTRACT_STATUS_LABELS[contract.status]}
              </Badge>
              <span className="text-sm font-semibold">
                {contract.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </span>
              {contract.document_url && (
                <a
                  href={contract.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Ver
                </a>
              )}
              {canEdit && contract.status !== "firmado" && contract.status !== "anulado" && (
                <button
                  onClick={() => setSignOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Firmar contrato
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="tutorias">
          <TabsList className="mb-4">
            <TabsTrigger value="tutorias">
              Tutorías ({followups.length})
            </TabsTrigger>
            <TabsTrigger value="certificado">Certificado</TabsTrigger>
          </TabsList>

          {/* ── TUTORÍAS ── */}
          <TabsContent value="tutorias" className="space-y-4">
            {canFollowup && (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setAddFollowupOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Registrar seguimiento
                </Button>
              </div>
            )}
            {followups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin seguimientos registrados para esta matrícula.
              </p>
            ) : (
              <div className="space-y-3">
                {followups.map((f) => (
                  <div key={f.id} className="rounded-lg border bg-card p-4 text-sm">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="text-muted-foreground">
                        {new Date(f.followup_date).toLocaleDateString("es-ES")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {CONTACT_TYPE_LABELS[f.contact_type]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {FOLLOWUP_STATUS_LABELS[f.student_status_snapshot]}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {f.creator?.full_name ?? "—"}
                      </span>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap">{f.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── CERTIFICADO ── */}
          <TabsContent value="certificado" className="space-y-4">
            {certificate ? (
              <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs font-semibold ${CERT_STATUS_VARIANT[certificate.status]}`}>
                      {CERT_STATUS_LABELS[certificate.status]}
                    </Badge>
                    {certificate.issued_at && (
                      <span className="text-xs text-muted-foreground">
                        Emitido: {new Date(certificate.issued_at).toLocaleDateString("es-ES")}
                      </span>
                    )}
                    {certificate.document_url && (
                      <a
                        href={certificate.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        Ver documento <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {canEdit && <CertificateStatusActions certificate={certificate} />}
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Adjuntos del certificado
                  </p>
                  <AttachmentsTab
                    studentId={student.id}
                    certificateId={certificate.id}
                    attachments={attachments}
                    canUpload={canEdit}
                    canDelete={canEdit}
                    compact
                  />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Sin certificado para esta matrícula.</p>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setAddCertOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Crear certificado
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Sub-dialogs */}
        <Dialog open={addFollowupOpen} onOpenChange={setAddFollowupOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar seguimiento — {courseName}</DialogTitle></DialogHeader>
            <FollowupForm
              key={String(addFollowupOpen)}
              enrollments={enrollmentForFollowup}
              onSuccess={() => setAddFollowupOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={addCertOpen} onOpenChange={setAddCertOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nuevo certificado — {courseName}</DialogTitle></DialogHeader>
            <CertificateForm
              key={String(addCertOpen)}
              enrollments={enrollmentForCert}
              onSuccess={() => setAddCertOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={signOpen} onOpenChange={setSignOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Firmar contrato</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="doc-url">URL del documento firmado</Label>
              <Input
                id="doc-url"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://drive.google.com/…"
              />
              <p className="text-xs text-muted-foreground">
                Pega el enlace al documento firmado (Drive, SharePoint, etc.)
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSignOpen(false)}>Cancelar</Button>
              <Button onClick={handleSign} disabled={!docUrl.trim() || isPendingSign}>
                {isPendingSign ? "Guardando…" : "Marcar como firmado"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
