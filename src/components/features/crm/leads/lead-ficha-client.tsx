"use client";

import { ArrowRight, UserCheck, UserPlus, X, RotateCcw } from "lucide-react";

import { ConfirmStatusDialog } from "@/components/features/crm/leads/confirm-status-dialog";
import { DiscardLeadDialog } from "@/components/features/crm/leads/discard-lead-dialog";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateLeadStatus } from "@/app/(app)/crm/leads/[id]/actions";
import { assignLeads } from "@/app/(app)/crm/leads/actions";
import { LeadAttachmentsTab } from "@/components/features/crm/leads/lead-attachments-tab";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { PhoneDisplay } from "@/components/shared/phone-display";
import { LeadForm } from "@/components/features/crm/leads/lead-form";
import { LeadAISummary } from "@/components/features/crm/leads/lead-ai-summary";
import { LeadInteractionsTimeline } from "@/components/features/crm/leads/lead-interactions-timeline";
import { LeadToStudentForm } from "@/components/features/crm/leads/lead-to-student-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CourseRow } from "@/lib/data/courses.repository";
import type { LeadInteractionRow } from "@/lib/data/lead-interactions.repository";
import type { LeadWithJoins } from "@/lib/data/leads.repository";
import type { UserRow } from "@/lib/data/users.repository";
import { DISCARD_REASON_LABELS, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/domain/leads/schema";
import type { DiscardReason } from "@/lib/domain/leads/schema";
import type { AttachmentWithUrl } from "@/lib/data/attachments.shared";
import type { ActivityLogRow } from "@/lib/data/activity-logs.repository";
import type { LeadStatus } from "@/types/database.types";

const STATUS_VARIANT: Record<LeadStatus, string> = {
  nuevo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  en_contacto:    "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  oferta_enviada: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  convertido: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  descartado: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border-red-200 dark:border-red-800",
};

// What transitions are available from each status
const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  nuevo:          ["en_contacto"],
  en_contacto:    ["oferta_enviada"],
  oferta_enviada: [],
  convertido: [],
  descartado: ["nuevo"],
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5 text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

export function LeadFichaClient({
  lead: initialLead,
  interactions,
  attachments,
  activityLogs,
  courses,
  users,
  currentUserId,
  currentUserName,
  canEdit,
  canAssign,
  convertedEnrollmentId,
}: {
  lead: LeadWithJoins;
  interactions: LeadInteractionRow[];
  attachments: AttachmentWithUrl[];
  activityLogs: ActivityLogRow[];
  courses: CourseRow[];
  users: UserRow[];
  currentUserId: string;
  currentUserName: string;
  canEdit: boolean;
  canAssign: boolean;
  convertedEnrollmentId: string | null;
}) {
  const [lead, setLead] = useState(initialLead);
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [isPendingStatus, startStatusTransition] = useTransition();
  const [isPendingAssign, startAssignTransition] = useTransition();

  const canConvert = lead.status !== "convertido" && lead.status !== "descartado";
  const canDiscard = lead.status !== "convertido" && lead.status !== "descartado";
  const nextStatuses = STATUS_TRANSITIONS[lead.status];

  const comerciales = users.filter((u) =>
    ["comercial", "jefe_comercial"].includes(u.role as string) && u.is_active
  );

  function handleStatusChange(newStatus: LeadStatus) {
    startStatusTransition(async () => {
      const result = await updateLeadStatus(lead.id, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        setLead((prev) => ({ ...prev, status: newStatus }));
        setPendingStatus(null);
        toast.success(`Lead marcado como "${LEAD_STATUS_LABELS[newStatus]}"`);
      }
    });
  }

  function handleAssign(newOwnerId: string) {
    startAssignTransition(async () => {
      const result = await assignLeads([lead.id], newOwnerId);
      if (result.error) {
        toast.error(result.error);
      } else {
        const ownerUser = users.find((u) => u.id === newOwnerId);
        setLead((prev) => ({
          ...prev,
          owner_id: newOwnerId,
          users: ownerUser ? { full_name: ownerUser.full_name } : prev.users,
        }));
        toast.success(`Lead asignado a ${ownerUser?.full_name ?? "comercial"}`);
        setAssignOpen(false);
      }
    });
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{lead.full_name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge className={`text-xs font-semibold border ${STATUS_VARIANT[lead.status]}`}>
              {LEAD_STATUS_LABELS[lead.status]}
            </Badge>
            {lead.interested_course && (
              <span className="text-sm text-muted-foreground">{lead.interested_course}</span>
            )}
          </div>
        </div>

        {/* Action buttons — dos grupos separados */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">

          {/* ── Pipeline: mueven el lead por el embudo ── */}
          {canEdit && (nextStatuses.length > 0 || canDiscard || lead.status === "descartado") && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                Pipeline
              </span>
              {nextStatuses.map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPendingStatus(next)}
                  disabled={isPendingStatus}
                >
                  <ArrowRight className="mr-1 h-3 w-3" />
                  {LEAD_STATUS_LABELS[next]}
                </Button>
              ))}
              {lead.status === "descartado" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPendingStatus("nuevo")}
                  disabled={isPendingStatus}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reactivar
                </Button>
              )}
              {canDiscard && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                  onClick={() => setDiscardOpen(true)}
                  disabled={isPendingStatus}
                >
                  <X className="mr-1 h-3 w-3" />
                  Descartar
                </Button>
              )}
            </div>
          )}

          {/* ── Operativos: gestión del lead ── */}
          {(canEdit || canAssign) && (
            <div className="flex items-center gap-1.5">
              {canAssign && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignOpen(true)}
                  disabled={isPendingAssign}
                >
                  <UserCheck className="mr-1 h-3.5 w-3.5" />
                  {lead.owner_id ? "Reasignar" : "Asignar"}
                </Button>
              )}
              {canEdit && canConvert && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (lead.status !== "oferta_enviada") {
                      toast.error("Para hacer la matrícula el lead debe estar en estado Oferta enviada");
                      return;
                    }
                    setConvertOpen(true);
                  }}
                  disabled={isPendingStatus}
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  Matricular
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  Editar datos
                </Button>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lead details */}
        <Card className="lg:col-span-1 h-fit card-shadow border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold">Datos del lead</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y-0">
              {/* Contacto */}
              <DetailRow label="Email" value={lead.email} />
              <DetailRow label="Teléfono" value={<PhoneDisplay phone={lead.phone} />} />

              {/* CRM */}
              <DetailRow label="Origen" value={LEAD_SOURCE_LABELS[lead.source]} />
              <DetailRow label="Curso de interés" value={lead.interested_course} />
              <DetailRow label="Pregunta 1" value={lead.pregunta1} />
              <DetailRow label="Pregunta 2" value={lead.pregunta2} />
              <DetailRow label="Pregunta 3" value={lead.pregunta3} />
              <div className="py-2 border-b border-border/50 last:border-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Propietario</dt>
                <dd className="text-sm font-medium mt-0.5">
                  {lead.owner_id && lead.users?.full_name ? (
                    lead.users.full_name
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      Sin asignar
                    </span>
                  )}
                </dd>
              </div>
              <DetailRow
                label="Creado"
                value={new Date(lead.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              />
              {lead.notes && (
                <div className="py-2 border-b border-border/50 last:border-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notas internas</dt>
                  <dd className="text-sm mt-0.5 whitespace-pre-wrap">{lead.notes}</dd>
                </div>
              )}

              {/* Motivo de descarte */}
              {lead.status === "descartado" && lead.discard_reason && (
                <div className="py-2 border-b border-border/50 last:border-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Motivo de descarte</dt>
                  <dd className="text-sm mt-0.5 font-medium text-red-700">
                    {DISCARD_REASON_LABELS[lead.discard_reason as DiscardReason] ?? lead.discard_reason}
                  </dd>
                  {lead.discard_notes && (
                    <dd className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{lead.discard_notes}</dd>
                  )}
                </div>
              )}

              {/* Datos para contrato — siempre visibles */}
              <div className="pt-3 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Datos para contrato
                </span>
              </div>
              <DetailRow label="DNI / NIE" value={lead.dni_nie} />
              <DetailRow label="Dirección" value={lead.address} />
              <DetailRow label="Provincia" value={lead.province} />
              <DetailRow label="Código postal" value={lead.postal_code} />
              <DetailRow
                label="Fecha de nacimiento"
                value={lead.birth_date
                  ? new Date(lead.birth_date + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
                  : null}
              />

              {/* Matrícula vinculada */}
              {lead.status === "convertido" && convertedEnrollmentId && (
                <div className="py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Matrícula</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`/enrollments/${convertedEnrollmentId}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Ver ficha de matrícula →
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Right: Timeline + Adjuntos */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <LeadAISummary leadId={lead.id} />
          <LeadInteractionsTimeline
            leadId={lead.id}
            initialInteractions={interactions}
            currentUserName={currentUserName}
            canAdd={canEdit && lead.status !== "convertido" && lead.status !== "descartado"}
            onStatusChange={(s) => setLead((prev) => ({ ...prev, status: s }))}
          />
          <Card className="card-shadow border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Adjuntos</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <LeadAttachmentsTab
                leadId={lead.id}
                attachments={attachments}
                canUpload={canEdit}
                canDelete={canEdit}
                currentUserName={currentUserName}
              />
            </CardContent>
          </Card>
          <Card className="card-shadow border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Actividad</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ActivityFeed logs={activityLogs} emptyText="Sin actividad registrada para este lead." />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Discard lead with reason */}
      <DiscardLeadDialog
        open={discardOpen}
        leadId={lead.id}
        leadName={lead.full_name}
        onSuccess={() => {
          setLead((prev) => ({ ...prev, status: "descartado" }));
          setDiscardOpen(false);
        }}
        onCancel={() => setDiscardOpen(false)}
      />

      {/* Confirm other status changes */}
      <ConfirmStatusDialog
        open={pendingStatus !== null}
        fromStatus={lead.status}
        toStatus={pendingStatus}
        leadName={lead.full_name}
        isPending={isPendingStatus}
        onConfirm={() => { if (pendingStatus) handleStatusChange(pendingStatus); }}
        onCancel={() => setPendingStatus(null)}
      />

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar lead</DialogTitle></DialogHeader>
          <LeadForm
            key={lead.id}
            lead={lead}
            users={users}
            currentUserId={currentUserId}
            canAssign={canAssign}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Assign / Reassign dialog */}
      {canAssign && (
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{lead.owner_id ? "Reasignar lead" : "Asignar lead"}</DialogTitle>
            </DialogHeader>
            <AssignForm
              currentOwnerName={lead.users?.full_name ?? null}
              comerciales={comerciales}
              onAssign={handleAssign}
              onCancel={() => setAssignOpen(false)}
              isPending={isPendingAssign}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Convert to student dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Matricular: {lead.full_name}</DialogTitle>
          </DialogHeader>
          <LeadToStudentForm
            lead={lead}
            courses={courses}
            onSuccess={() => setConvertOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Assign form ─────────────────────────────────────────────── */
function AssignForm({
  currentOwnerName,
  comerciales,
  onAssign,
  onCancel,
  isPending,
}: {
  currentOwnerName: string | null;
  comerciales: UserRow[];
  onAssign: (userId: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");

  return (
    <div className="flex flex-col gap-4 pt-1">
      {currentOwnerName && (
        <p className="text-sm text-muted-foreground">
          Propietario actual: <span className="font-semibold text-foreground">{currentOwnerName}</span>
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {currentOwnerName ? "Selecciona el nuevo propietario." : "Asigna este lead a un comercial."}
        {" "}La acción quedará registrada en el historial de actividad.
      </p>
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">— Selecciona un comercial —</option>
        {comerciales.map((u) => (
          <option key={u.id} value={u.id}>{u.full_name}</option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button disabled={!selectedId || isPending} onClick={() => onAssign(selectedId)}>
          <UserCheck className="mr-1.5 h-4 w-4" />
          {isPending ? "Guardando…" : "Confirmar"}
        </Button>
      </div>
    </div>
  );
}
