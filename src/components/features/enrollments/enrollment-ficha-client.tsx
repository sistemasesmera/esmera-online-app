"use client";

import {
  ArrowRight,
  Award,
  Banknote,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Hash,
  Layers,
  Lock,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, useEffect } from "react";
import { toast } from "sonner";

import {
  activateEnrollment,
  assignTutor,
  deleteSignedContract,
  signContractForEnrollment,
  updateEnrollmentStatus,
} from "@/app/(app)/enrollments/actions";
import { attachCertificateDocument, createCertificate } from "@/app/(app)/certificates/actions";
import { FollowupForm } from "@/components/features/tutoring/followup-form";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { BUCKET } from "@/lib/data/attachments.shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { EnrollmentAttachmentsTab } from "@/components/features/enrollments/enrollment-attachments-tab";
import type { ActivityLogRow } from "@/lib/data/activity-logs.repository";
import type { AttachmentWithUrl } from "@/lib/data/attachments.shared";
import type { CertificateWithJoins } from "@/lib/data/certificates.repository";
import type { EnrollmentFicha } from "@/lib/data/enrollments.repository";
import type { FollowupForStudent } from "@/lib/data/followups.repository";
import type { PlatformRow } from "@/lib/data/platforms.repository";
import type { TutorWithUser } from "@/lib/data/tutors.repository";
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_TRANSITIONS,
  getTransitionLabel,
} from "@/lib/domain/enrollments/schema";
import { CONTACT_TYPE_LABELS } from "@/lib/domain/followups/schema";
import type { CashMethod, ContractStatus, EnrollmentStatus, Financer, PaymentType } from "@/types/database.types";

const STATUS_VARIANT: Record<EnrollmentStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  validada: "bg-blue-100 text-blue-700 border-blue-200",
  activa: "bg-emerald-100 text-emerald-700 border-emerald-200",
  finalizada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada: "bg-red-100 text-red-700 border-red-200",
};

const CONTRACT_VARIANT: Record<ContractStatus, string> = {
  borrador: "bg-slate-100 text-slate-600",
  enviado: "bg-blue-100 text-blue-700",
  firmado: "bg-emerald-100 text-emerald-700",
  anulado: "bg-red-100 text-red-700",
};

const CONTRACT_LABELS: Record<ContractStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  firmado: "Firmado",
  anulado: "Anulado",
};

const CERT_STATUS_VARIANT: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  emitido: "bg-emerald-100 text-emerald-700 border-emerald-200",
  anulado: "bg-red-100 text-red-700 border-red-200",
};

const CERT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  emitido: "Emitido",
  anulado: "Anulado",
};

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium mt-0.5 text-foreground">{value || "—"}</dd>
    </div>
  );
}

type ContractSummary = {
  amount: number;
  payment_type: PaymentType | null;
  cash_method: CashMethod | null;
  cash_amount: number | null;
  financer: Financer | null;
  financed_amount: number | null;
};

const PAYMENT_TYPE_CONFIG: Record<PaymentType, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string; iconCls: string }> = {
  contado:    { label: "Contado",    icon: Banknote,    cls: "bg-emerald-50 border-emerald-200 text-emerald-800", iconCls: "text-emerald-600" },
  financiado: { label: "Financiado", icon: CreditCard,  cls: "bg-blue-50 border-blue-200 text-blue-800",          iconCls: "text-blue-600"    },
  mixto:      { label: "Mixto",      icon: Layers,      cls: "bg-violet-50 border-violet-200 text-violet-800",     iconCls: "text-violet-600"  },
};

const CASH_METHOD_LABELS: Record<CashMethod, string> = { transferencia: "Transferencia bancaria", efectivo: "Efectivo" };
const FINANCER_LABELS: Record<Financer, string> = { alma: "Alma", sabadell: "Sabadell", sequra: "SeQura", esmera: "Esmera" };

function fmt(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function EconomicSummaryCard({ contract }: { contract: ContractSummary }) {
  const pt = contract.payment_type;
  const ptConfig = pt ? PAYMENT_TYPE_CONFIG[pt] : null;
  const PtIcon = ptConfig?.icon;

  return (
    <Card className="border card-shadow">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          Resumen económico
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          {/* Total + forma de pago */}
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Total contrato</p>
              <p className="text-3xl font-black tracking-tight">{fmt(contract.amount)}</p>
            </div>
            {ptConfig && PtIcon && (
              <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-semibold text-sm ${ptConfig.cls}`}>
                <PtIcon className={`h-4 w-4 ${ptConfig.iconCls}`} />
                {ptConfig.label}
              </div>
            )}
            {!pt && (
              <p className="text-sm text-muted-foreground italic">Sin forma de pago registrada</p>
            )}
          </div>

          {/* Desglose */}
          {pt && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bloque contado */}
              {(pt === "contado" || pt === "mixto") && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    {pt === "mixto" ? "Parte en contado" : "Pago en contado"}
                  </p>
                  <p className="text-xl font-black">
                    {fmt(pt === "mixto" ? (contract.cash_amount ?? 0) : contract.amount)}
                  </p>
                  {contract.cash_method && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Banknote className="h-3 w-3" />
                      {CASH_METHOD_LABELS[contract.cash_method]}
                    </p>
                  )}
                </div>
              )}

              {/* Bloque financiado */}
              {(pt === "financiado" || pt === "mixto") && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    {pt === "mixto" ? "Parte financiada" : "Financiación"}
                  </p>
                  <p className="text-xl font-black">
                    {fmt(pt === "mixto" ? (contract.financed_amount ?? 0) : contract.amount)}
                  </p>
                  {contract.financer && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {FINANCER_LABELS[contract.financer]}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Verificación de suma mixto */}
          {pt === "mixto" && contract.cash_amount != null && contract.financed_amount != null && (
            <p className="text-xs text-muted-foreground border-t pt-2">
              {fmt(contract.cash_amount)} contado + {fmt(contract.financed_amount)} financiado
              {" = "}
              <span className="font-semibold text-foreground">{fmt(contract.cash_amount + contract.financed_amount)}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EnrollmentFichaClient({
  enrollment,
  followups,
  certificate,
  platforms,
  tutors,
  attachments,
  studentAttachments,
  activityLogs,
  canEdit,
  canSign,
  canFollowup,
  currentUserName,
}: {
  enrollment: EnrollmentFicha;
  followups: FollowupForStudent[];
  certificate: CertificateWithJoins | undefined;
  platforms: PlatformRow[];
  tutors: TutorWithUser[];
  attachments: AttachmentWithUrl[];
  studentAttachments: AttachmentWithUrl[];
  activityLogs: ActivityLogRow[];
  canEdit: boolean;
  canSign: boolean;
  canFollowup: boolean;
  currentUserName?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUpload] = useTransition();
  const [isCertUploading, startCertUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certFileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [activateOpen, setActivateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [deleteContractOpen, setDeleteContractOpen] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [certDocOpen, setCertDocOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingForSignature, setIsSendingForSignature] = useState(false);
  const [sendSignatureOpen, setSendSignatureOpen] = useState(false);
  const [signatureEmail, setSignatureEmail] = useState("");
  const [certPendingFile, setCertPendingFile] = useState<File | null>(null);
  const [platformId, setPlatformId] = useState(enrollment.platform_id ?? "");
  const [tutorId, setTutorId] = useState(enrollment.tutor_id ?? "");

  const contractStatus = enrollment.contracts?.[0]?.status;

  // Poll for contract updates while awaiting signature
  useEffect(() => {
    if (contractStatus !== "enviado") return;
    const interval = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(interval);
  }, [contractStatus, router]);

  const student = enrollment.students;
  const contract = enrollment.contracts?.[0];
  const nextStatuses = ENROLLMENT_STATUS_TRANSITIONS[enrollment.status];
  const isActiva = enrollment.status === "activa";
  const isValidada = enrollment.status === "validada";

  function handleTransition(next: EnrollmentStatus) {
    if (next === "activa") {
      setPlatformId(enrollment.platform_id ?? "");
      setTutorId(enrollment.tutor_id ?? "");
      setActivateOpen(true);
      return;
    }
    startTransition(async () => {
      const result = await updateEnrollmentStatus(enrollment.id, next);
      if (result.error) toast.error(result.error);
      else toast.success(`Matrícula: ${ENROLLMENT_STATUS_LABELS[next]}`);
    });
  }

  function handleActivate() {
    startTransition(async () => {
      const result = await activateEnrollment(enrollment.id, platformId || null, tutorId || null);
      if (result.error) toast.error(result.error);
      else { toast.success("Matrícula en curso"); setActivateOpen(false); }
    });
  }

  function handleAssign() {
    startTransition(async () => {
      const result = await assignTutor(enrollment.id, tutorId || null, platformId || null);
      if (result.error) toast.error(result.error);
      else { toast.success("Tutor y plataforma asignados"); setAssignOpen(false); }
    });
  }

  function handleDeleteContract() {
    startTransition(async () => {
      const result = await deleteSignedContract(enrollment.id, contract?.document_url ?? null);
      if (result.error) toast.error(result.error);
      else { toast.success("Contrato eliminado. Puedes subir uno nuevo."); setDeleteContractOpen(false); }
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openSendSignatureDialog() {
    setSignatureEmail(student?.email ?? "");
    setSendSignatureOpen(true);
  }

  async function handleSendForSignature() {
    setSendSignatureOpen(false);
    setIsSendingForSignature(true);
    try {
      const res = await fetch(`/api/enrollments/${enrollment.id}/send-for-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signatureEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) toast.error(json.error ?? "Error al enviar para firma");
      else {
        toast.success(`Contrato enviado a ${signatureEmail.trim()} para firma`);
        router.refresh();
      }
    } catch {
      toast.error("Error al enviar para firma");
    } finally {
      setIsSendingForSignature(false);
    }
  }

  async function handleDownloadPdf() {
    setIsGeneratingPdf(true);
    try {
      const res = await fetch(`/api/enrollments/${enrollment.id}/contract`);
      if (!res.ok) throw new Error("Error del servidor");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `matricula-${enrollment.enrollment_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo generar el contrato PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  }


  function handleSign() {
    if (!pendingFile) return;
    const file = pendingFile;
    startUpload(async () => {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `contracts/${enrollment.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`Error al subir el archivo: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      const result = await signContractForEnrollment(enrollment.id, urlData?.signedUrl ?? path);
      if (result.error) {
        toast.error(result.error);
        await supabase.storage.from(BUCKET).remove([path]);
      } else {
        toast.success("Contrato firmado y adjuntado");
        setSignOpen(false);
        setPendingFile(null);
      }
    });
  }

  function handleCertFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCertPendingFile(file);
    if (certFileInputRef.current) certFileInputRef.current.value = "";
  }

  function handleCertUpload() {
    if (!certPendingFile || !certificate) return;
    const file = certPendingFile;
    startCertUpload(async () => {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `certificates/${enrollment.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`Error al subir el archivo: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      const result = await attachCertificateDocument(certificate.id, urlData?.signedUrl ?? path);
      if (result.error) {
        toast.error(result.error);
        await supabase.storage.from(BUCKET).remove([path]);
      } else {
        toast.success("Certificado adjuntado");
        setCertDocOpen(false);
        setCertPendingFile(null);
      }
    });
  }

  function handleCreateCertificate() {
    startTransition(async () => {
      const result = await createCertificate({ enrollment_id: enrollment.id });
      if (result.error) toast.error(result.error);
      else toast.success("Certificado creado");
    });
  }

  const enrollmentForFollowup = [{
    id: enrollment.id,
    students: student ? { full_name: student.full_name } : null,
    courses: enrollment.courses,
  }];

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {student?.full_name ?? "—"}
          </h1>
          <p className="text-muted-foreground mt-0.5">{enrollment.courses?.name ?? "—"}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`text-xs font-semibold border ${STATUS_VARIANT[enrollment.status]}`}>
              {ENROLLMENT_STATUS_LABELS[enrollment.status]}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 rounded px-1.5 py-0.5">
              <Hash className="h-3 w-3" />{enrollment.enrollment_number}
            </span>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2 shrink-0">
            {isValidada && (
              <Button
                size="sm"
                variant="outline"
                className="text-violet-700 border-violet-200 hover:bg-violet-50"
                onClick={() => {
                  setPlatformId(enrollment.platform_id ?? "");
                  setTutorId(enrollment.tutor_id ?? "");
                  setAssignOpen(true);
                }}
              >
                Asignar Tutor
              </Button>
            )}
            {nextStatuses.map((next) => (
              <Button
                key={next}
                size="sm"
                variant={next === "cancelada" ? "destructive" : "outline"}
                disabled={isPending}
                onClick={() => handleTransition(next as EnrollmentStatus)}
              >
                <ArrowRight className="mr-1 h-3.5 w-3.5" />
                {getTransitionLabel(enrollment.status, next as EnrollmentStatus)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body: 3-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left sidebar ── */}
        <div className="flex flex-col gap-4">
          {/* Alumno */}
          <Card className="border card-shadow">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Alumno
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <dl>
                <DetailRow label="Nombre completo" value={student?.full_name} />
                <DetailRow label="DNI / NIE" value={student?.dni_nie} />
                <DetailRow label="Email" value={student?.email} />
                <DetailRow label="Teléfono" value={student?.phone} />
                <DetailRow label="Dirección" value={student?.address} />
                <DetailRow label="Provincia" value={student?.province} />
                <DetailRow label="Código postal" value={student?.postal_code} />
                <DetailRow
                  label="Fecha de nacimiento"
                  value={student?.birth_date
                    ? new Date(student.birth_date + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
                    : null}
                />
              </dl>
              {student && (
                <Link
                  href={`/students/${student.id}`}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-3"
                >
                  Ver ficha completa del alumno →
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Contrato */}
          <Card className="border card-shadow">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 flex flex-col gap-3">
              {contract ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs font-semibold ${CONTRACT_VARIANT[contract.status]}`}>
                      {contract.status === "firmado"
                        ? <FileCheck2 className="mr-1 h-3 w-3 inline" />
                        : <FileText className="mr-1 h-3 w-3 inline" />}
                      {CONTRACT_LABELS[contract.status]}
                    </Badge>
                    <span className="text-sm font-bold">
                      {contract.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </span>
                  </div>

                  {contract.payment_type && (
                    <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs space-y-0.5">
                      <p className="font-semibold text-foreground capitalize">
                        {{contado:"Contado",financiado:"Financiado",mixto:"Mixto"}[contract.payment_type]}
                      </p>
                      {(contract.payment_type === "contado" || contract.payment_type === "mixto") && contract.cash_method && (
                        <p className="text-muted-foreground">
                          {contract.payment_type === "mixto"
                            ? `${(contract.cash_amount ?? 0).toLocaleString("es-ES",{style:"currency",currency:"EUR"})} en contado`
                            : `${contract.amount.toLocaleString("es-ES",{style:"currency",currency:"EUR"})} en contado`}{" "}
                          · {{transferencia:"Transferencia",efectivo:"Efectivo"}[contract.cash_method]}
                        </p>
                      )}
                      {(contract.payment_type === "financiado" || contract.payment_type === "mixto") && contract.financer && (
                        <p className="text-muted-foreground">
                          {contract.payment_type === "mixto"
                            ? `${(contract.financed_amount ?? 0).toLocaleString("es-ES",{style:"currency",currency:"EUR"})} financiado`
                            : `${contract.amount.toLocaleString("es-ES",{style:"currency",currency:"EUR"})} financiado`}{" "}
                          · {{alma:"Alma",sabadell:"Sabadell",sequra:"Sequra",esmera:"Esmera"}[contract.financer]}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Contrato firmado manualmente (subido) */}
                  {contract.status === "firmado" && !contract.docuseal_submission_id && (
                    <div className="rounded-lg border bg-muted/30 px-3 py-2.5 flex flex-col gap-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Contrato firmado
                      </p>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium leading-5">Subido manualmente</p>
                          {contract.signed_at && (
                            <p className="text-[10px] text-muted-foreground leading-4">
                              {new Date(contract.signed_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                              {" · "}
                              {new Date(contract.signed_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                          {contract.document_url && (
                            <a href={contract.document_url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline leading-4">
                              <ExternalLink className="h-3 w-3" />
                              Ver documento
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Firma electrónica: tracker de estado */}
                  {contract.docuseal_submission_id && (
                    <div className="rounded-lg border bg-muted/30 px-3 py-2.5 flex flex-col gap-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Firma electrónica
                      </p>

                      {/* Paso 1: Generado */}
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-xs font-medium leading-5">Contrato generado</p>
                      </div>
                      <div className="ml-[7px] w-px h-3 bg-border" />

                      {/* Paso 2: Enviado */}
                      <div className="flex items-start gap-2">
                        {contract.sent_at
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          : <Circle className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0" />}
                        <div>
                          <p className={`text-xs font-medium leading-5 ${!contract.sent_at ? "text-muted-foreground" : ""}`}>
                            Enviado para firma
                          </p>
                          {contract.sent_at && (
                            <p className="text-[10px] text-muted-foreground leading-4">
                              {new Date(contract.sent_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                              {" · "}
                              {new Date(contract.sent_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                              {student?.email ? ` · ${student.email}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-[7px] w-px h-3 bg-border" />

                      {/* Paso 3: Firmado */}
                      <div className="flex items-start gap-2">
                        {contract.status === "firmado"
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          : contract.status === "enviado"
                          ? <Clock className="h-4 w-4 text-blue-500 mt-0.5 shrink-0 animate-pulse" />
                          : <Circle className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0" />}
                        <div>
                          <p className={`text-xs font-medium leading-5 ${contract.status === "enviado" ? "text-blue-700" : contract.status !== "firmado" ? "text-muted-foreground" : ""}`}>
                            {contract.status === "enviado" ? "Pendiente de firma" : "Firmado digitalmente"}
                          </p>
                          {contract.signed_at && (
                            <p className="text-[10px] text-muted-foreground leading-4">
                              {new Date(contract.signed_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                              {" · "}
                              {new Date(contract.signed_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                          {contract.document_url && contract.status === "firmado" && (
                            <a href={contract.document_url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline leading-4">
                              <ExternalLink className="h-3 w-3" />
                              Ver PDF firmado
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {canSign && contract.status === "borrador" && (
                    <Button
                      size="sm"
                      disabled={isSendingForSignature}
                      onClick={openSendSignatureDialog}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {isSendingForSignature ? "Enviando…" : "Enviar para firma"}
                    </Button>
                  )}
                  {canSign && contract.status === "enviado" && contract.docuseal_signing_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(contract.docuseal_signing_url!);
                        toast.success("Enlace copiado");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar enlace de firma
                    </Button>
                  )}
                  {(canEdit || canSign) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isGeneratingPdf}
                      onClick={handleDownloadPdf}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isGeneratingPdf ? "Generando…" : "Generar contrato PDF"}
                    </Button>
                  )}

                  {canSign && contract.status === "firmado" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => setDeleteContractOpen(true)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Eliminar contrato firmado
                    </Button>
                  )}
                  {canSign && contract.status !== "firmado" && contract.status !== "anulado" && (
                    <Button size="sm" variant="outline" onClick={() => setSignOpen(true)}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Subir contrato firmado
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sin contrato asociado.</p>
              )}
            </CardContent>
          </Card>
          {/* Certificado */}
          <Card className="border card-shadow">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                Certificado
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 flex flex-col gap-3">
              {certificate ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs font-semibold border ${CERT_STATUS_VARIANT[certificate.status]}`}>
                      {CERT_STATUS_LABELS[certificate.status] ?? certificate.status}
                    </Badge>
                  </div>
                  {certificate.issued_at && (
                    <p className="text-xs text-muted-foreground">
                      Emitido el {new Date(certificate.issued_at).toLocaleDateString("es-ES")}
                    </p>
                  )}
                  {certificate.document_url && (
                    <a
                      href={certificate.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver certificado
                    </a>
                  )}
                  {canSign && (
                    <Button size="sm" variant="outline" onClick={() => setCertDocOpen(true)}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {certificate.document_url ? "Reemplazar documento" : "Subir certificado"}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Sin certificado.</p>
                  {canSign && (
                    <Button size="sm" variant="outline" disabled={isPending} onClick={handleCreateCertificate}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Crear certificado
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Adjuntos del alumno */}
          <Card className="border card-shadow">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Adjuntos del alumno
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 flex flex-col gap-1.5">
              {studentAttachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin adjuntos</p>
              ) : (
                <>
                  {studentAttachments.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-foreground">{a.title ?? a.file_name}</span>
                      {a.signed_url && (
                        <a
                          href={a.signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          title="Abrir archivo"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                  {studentAttachments.length > 4 && (
                    <Link
                      href={`/students/${student?.id}`}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1"
                    >
                      Ver todos ({studentAttachments.length}) →
                    </Link>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right main ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Datos de la matrícula */}
          <Card className="border card-shadow">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Datos de la matrícula</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="grid grid-cols-2 gap-x-8">
                <dl>
                  <DetailRow label="Fecha de matrícula" value={fmtDate(enrollment.enrollment_date)} />
                  <DetailRow label="Fecha de inicio" value={fmtDate(enrollment.start_date)} />
                  <DetailRow label="Fecha de fin" value={fmtDate(enrollment.end_date)} />
                  <DetailRow
                    label="Duración de la matrícula"
                    value={
                      enrollment.duration_months != null
                        ? enrollment.duration_months === 1
                          ? "1 mes"
                          : `${enrollment.duration_months} meses`
                        : null
                    }
                  />
                </dl>
                <dl>
                  <DetailRow label="Plataforma" value={enrollment.platforms?.name} />
                  <DetailRow label="Tutor asignado" value={enrollment.tutors?.users?.full_name} />
                  <DetailRow label="Notas" value={enrollment.notes} />
                </dl>
              </div>
            </CardContent>
          </Card>

          {/* Resumen económico */}
          {contract && (
            <EconomicSummaryCard contract={contract} />
          )}

          {/* Tabs: Tutorías / Adjuntos / Actividad */}
          <Tabs defaultValue="tutorias">
            <TabsList>
              <TabsTrigger value="tutorias" className="flex items-center gap-1.5">
                {!isActiva && <Lock className="h-3 w-3" />}
                Tutorías
                {isActiva && followups.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {followups.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="adjuntos">
                Adjuntos
                {attachments.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {attachments.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="actividad">Actividad</TabsTrigger>
            </TabsList>

            <TabsContent value="tutorias" className="mt-4">
              {!isActiva ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center rounded-xl border border-dashed border-border bg-muted/30">
                  <Lock className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Las tutorías estarán disponibles cuando la matrícula esté{" "}
                    <span className="font-semibold text-emerald-600">En curso</span>.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Estado actual: {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {canFollowup && (
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => setFollowupOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" />
                        Registrar tutoría
                      </Button>
                    </div>
                  )}

                  {followups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sin tutorías registradas para esta matrícula.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {followups.map((f) => (
                        <div key={f.id} className="rounded-lg border bg-card p-4 text-sm">
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="font-semibold text-foreground">
                              {new Date(f.followup_date).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            <Badge variant="outline" className="text-xs font-medium">
                              {CONTACT_TYPE_LABELS[f.contact_type]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {f.tutors?.users?.full_name ?? "—"}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              Registrado{" "}
                              {new Date(f.created_at).toLocaleString("es-ES", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-wrap">{f.notes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="adjuntos" className="mt-4">
              <EnrollmentAttachmentsTab
                enrollmentId={enrollment.id}
                studentId={enrollment.student_id}
                attachments={attachments}
                canUpload={canEdit || canSign}
                canDelete={canEdit || canSign}
                currentUserName={currentUserName}
              />
            </TabsContent>

            <TabsContent value="actividad" className="mt-4">
              <ActivityFeed
                logs={activityLogs}
                emptyText="Sin actividad registrada para esta matrícula."
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* Assign tutor */}
      <Dialog open={assignOpen} onOpenChange={(v) => !v && setAssignOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar Tutor</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Tutor asignado</Label>
              <Select value={tutorId} onValueChange={setTutorId}>
                <SelectTrigger><SelectValue placeholder="Selecciona un tutor…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin tutor</SelectItem>
                  {tutors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.users?.full_name ?? "—"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Plataforma</Label>
              <Select value={platformId} onValueChange={setPlatformId}>
                <SelectTrigger><SelectValue placeholder="Sin plataforma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin plataforma</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate */}
      <Dialog open={activateOpen} onOpenChange={(v) => !v && setActivateOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Activar matrícula</DialogTitle>
            <p className="text-sm text-muted-foreground">Confirma la plataforma y tutor antes de poner la matrícula en curso.</p>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Plataforma</Label>
              <Select value={platformId} onValueChange={setPlatformId}>
                <SelectTrigger><SelectValue placeholder="Sin plataforma asignada" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin plataforma</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tutor asignado</Label>
              <Select value={tutorId} onValueChange={setTutorId}>
                <SelectTrigger><SelectValue placeholder="Sin tutor asignado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin tutor</SelectItem>
                  {tutors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.users?.full_name ?? "—"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleActivate} disabled={isPending}>
              {isPending ? "Activando…" : "Confirmar y activar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send for signature — email confirmation */}
      <Dialog open={sendSignatureOpen} onOpenChange={(v) => !v && setSendSignatureOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar contrato para firma</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              El contrato se enviará al siguiente correo electrónico. Puedes cambiarlo si necesitas que lo firme otra persona.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sig-email">Email del firmante</Label>
              <Input
                id="sig-email"
                type="email"
                value={signatureEmail}
                onChange={(e) => setSignatureEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendSignatureOpen(false)}>Cancelar</Button>
            <Button
              disabled={!signatureEmail.trim() || isSendingForSignature}
              onClick={handleSendForSignature}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar para firma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete signed contract confirmation */}
      <Dialog open={deleteContractOpen} onOpenChange={(v) => !v && setDeleteContractOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar contrato firmado?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Se eliminará el documento adjunto y el contrato volverá a estado <strong>Borrador</strong>. Podrás subir uno nuevo a continuación.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContractOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteContract} disabled={isPending}>
              {isPending ? "Eliminando…" : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign contract */}
      <Dialog open={signOpen} onOpenChange={(v) => { if (!v) { setSignOpen(false); setPendingFile(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Subir contrato firmado</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Adjunta el PDF o documento con la firma del cliente para registrar el contrato como firmado.
            </p>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
            />
            {pendingFile ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                <FileCheck2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(pendingFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={() => setPendingFile(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">Seleccionar documento</span>
                <span className="text-xs text-muted-foreground">PDF, Word o imagen</span>
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSignOpen(false); setPendingFile(null); }} disabled={isUploading}>
              Cancelar
            </Button>
            <Button onClick={handleSign} disabled={!pendingFile || isUploading}>
              {isUploading ? "Subiendo…" : "Marcar como firmado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate upload */}
      <input
        ref={certFileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleCertFileSelect}
      />
      <Dialog open={certDocOpen} onOpenChange={(v) => { if (!v) { setCertDocOpen(false); setCertPendingFile(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Subir certificado</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Adjunta el documento del certificado para esta matrícula.
            </p>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {certPendingFile ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                <FileCheck2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{certPendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(certPendingFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={() => setCertPendingFile(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                onClick={() => certFileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">Seleccionar documento</span>
                <span className="text-xs text-muted-foreground">PDF, Word o imagen</span>
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCertDocOpen(false); setCertPendingFile(null); }} disabled={isCertUploading}>
              Cancelar
            </Button>
            <Button onClick={handleCertUpload} disabled={!certPendingFile || isCertUploading}>
              {isCertUploading ? "Subiendo…" : "Guardar certificado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Followup */}
      {canFollowup && (
        <Dialog open={followupOpen} onOpenChange={setFollowupOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar tutoría</DialogTitle>
            </DialogHeader>
            <FollowupForm
              key={String(followupOpen)}
              enrollments={enrollmentForFollowup}
              presetEnrollmentId={enrollment.id}
              onSuccess={() => setFollowupOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
