"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Phone, Mail, ChevronDown, ArrowRightLeft, CheckCircle2,
  XCircle, Clock, MessageSquare, TrendingUp,
} from "lucide-react";

import {
  moveOpportunityStage,
  updateOpportunityStatus,
  updateOpportunityValue,
  findLeadForOpportunity,
} from "@/app/(app)/crm/opportunities/actions";
import { LeadToStudentForm } from "@/components/features/crm/leads/lead-to-student-form";
import { STATUS_LABELS, STATUS_COLORS } from "@/components/features/crm/opportunities/opportunity-card";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActivityLogRow } from "@/lib/data/activity-logs.repository";
import type { CourseRow } from "@/lib/data/courses.repository";
import type { GhlNote, GhlOpportunityEnriched, GhlPipelineStage } from "@/lib/data/ghl-opportunities.repository";
import type { LeadWithJoins } from "@/lib/data/leads.repository";

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value ?? "—"}</dd>
    </div>
  );
}

// Combina activity_logs + notas GHL en un timeline unificado
function mergeTimeline(
  logs: ActivityLogRow[],
  ghlNotes: GhlNote[]
): Array<{ type: "log"; item: ActivityLogRow } | { type: "note"; item: GhlNote }> {
  const result: Array<{ type: "log"; item: ActivityLogRow } | { type: "note"; item: GhlNote }> = [
    ...logs.map((item) => ({ type: "log" as const, item })),
    ...ghlNotes.map((item) => ({ type: "note" as const, item })),
  ];
  return result.sort((a, b) => {
    const dateA = a.type === "log" ? a.item.created_at : a.item.dateAdded;
    const dateB = b.type === "log" ? b.item.created_at : b.item.dateAdded;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

export function OpportunityFichaClient({
  opp: initialOpp,
  stages,
  currentStage,
  activityLogs,
  ghlNotes,
  courses,
  canEdit,
}: {
  opp: GhlOpportunityEnriched;
  stages: GhlPipelineStage[];
  currentStage: GhlPipelineStage | null;
  activityLogs: ActivityLogRow[];
  ghlNotes: GhlNote[];
  courses: CourseRow[];
  canEdit: boolean;
}) {
  const [opp, setOpp] = useState(initialOpp);
  const [stage, setStage] = useState(currentStage);
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(opp.monetaryValue ?? ""));
  const [isPending, startTransition] = useTransition();
  const [enrollDialog, setEnrollDialog] = useState<{ open: boolean; lead: LeadWithJoins | null }>({
    open: false, lead: null,
  });

  const otherStages = stages.filter((s) => s.id !== opp.pipelineStageId);
  const timeline = mergeTimeline(activityLogs, ghlNotes);

  function handleMoveStage(newStageId: string) {
    const toStage = stages.find((s) => s.id === newStageId);
    const fromStage = stage;
    startTransition(async () => {
      const res = await moveOpportunityStage(opp.id, newStageId, {
        contactName: opp.contact.name,
        fromStageName: fromStage?.name,
        toStageName: toStage?.name,
      });
      if (res.success) {
        setOpp((prev) => ({ ...prev, pipelineStageId: newStageId }));
        setStage(toStage ?? null);
        toast.success(`Movido a "${toStage?.name}"`);
      } else {
        toast.error(res.error ?? "Error al mover");
      }
    });
  }

  function handleStatus(status: "open" | "won" | "lost" | "abandoned") {
    if (status === "won" && canEdit) {
      handleMarkWon();
      return;
    }
    startTransition(async () => {
      const res = await updateOpportunityStatus(opp.id, status, {
        contactName: opp.contact.name,
        fromStatus: opp.status,
      });
      if (res.success) {
        setOpp((prev) => ({ ...prev, status }));
        toast.success(`Estado: ${STATUS_LABELS[status]}`);
      } else {
        toast.error(res.error ?? "Error");
      }
    });
  }

  function handleValueSave() {
    const v = parseFloat(valueInput);
    if (isNaN(v) || v < 0) { toast.error("Importe inválido"); return; }
    startTransition(async () => {
      const res = await updateOpportunityValue(opp.id, v, { contactName: opp.contact.name });
      if (res.success) {
        setOpp((prev) => ({ ...prev, monetaryValue: v }));
        setEditingValue(false);
        toast.success("Valor actualizado");
      } else {
        toast.error(res.error ?? "Error");
      }
    });
  }

  function handleMarkWon() {
    if (!opp.contact.phone) {
      startTransition(async () => {
        const res = await updateOpportunityStatus(opp.id, "won", { contactName: opp.contact.name, fromStatus: opp.status });
        if (res.success) { setOpp((p) => ({ ...p, status: "won" })); toast.success("Marcado como ganado"); }
        else toast.error(res.error ?? "Error");
      });
      return;
    }

    startTransition(async () => {
      const { lead, alreadyConverted } = await findLeadForOpportunity(opp.contact.phone!);
      if (alreadyConverted) {
        await updateOpportunityStatus(opp.id, "won", { contactName: opp.contact.name, fromStatus: opp.status });
        setOpp((p) => ({ ...p, status: "won" }));
        toast.info("Contacto ya tiene matrícula. Marcado como ganado en GHL.");
      } else if (lead) {
        setEnrollDialog({ open: true, lead });
      } else {
        const res = await updateOpportunityStatus(opp.id, "won", { contactName: opp.contact.name, fromStatus: opp.status });
        if (res.success) { setOpp((p) => ({ ...p, status: "won" })); toast.success("Marcado como ganado en GHL. Para crear matrícula, ve a Leads."); }
        else toast.error(res.error ?? "Error");
      }
    });
  }

  return (
    <>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight">{opp.contact.name}</h1>
            <Badge variant="outline" className={`${STATUS_COLORS[opp.status]}`}>
              {STATUS_LABELS[opp.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {stage ? `Etapa: ${stage.name}` : "Sin etapa"}
            {opp.monetaryValue != null && (
              <span className="ml-3 font-semibold text-primary">{formatCurrency(opp.monetaryValue)}</span>
            )}
          </p>
        </div>

        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            {/* Marcar ganada */}
            {opp.status !== "won" && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isPending}
                onClick={handleMarkWon}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Marcar ganada
              </Button>
            )}
            {/* Marcar perdida */}
            {opp.status === "open" && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={isPending}
                onClick={() => handleStatus("lost")}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Marcar perdida
              </Button>
            )}
            {/* Mover etapa */}
            {otherStages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending}>
                    <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                    Mover etapa <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs">Mover a etapa</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {otherStages.map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => handleMoveStage(s.id)}>
                      {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* Todos los estados */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isPending}>
                  Estado <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {(["open", "won", "lost", "abandoned"] as const).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatus(s)}
                    className={opp.status === s ? "font-semibold" : ""}
                  >
                    {STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="lg:col-span-1 space-y-4">
          {/* Datos del contacto */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl>
                {opp.contact.phone && (
                  <DetailRow
                    label="Teléfono"
                    value={
                      <a href={`tel:${opp.contact.phone}`} className="flex items-center gap-1.5 hover:text-primary">
                        <Phone className="h-3.5 w-3.5" />
                        {opp.contact.phone}
                      </a>
                    }
                  />
                )}
                {opp.contact.email && (
                  <DetailRow
                    label="Email"
                    value={
                      <a href={`mailto:${opp.contact.email}`} className="flex items-center gap-1.5 hover:text-primary truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{opp.contact.email}</span>
                      </a>
                    }
                  />
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Datos de la oportunidad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Oportunidad</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl>
                <DetailRow label="Estado" value={
                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[opp.status]}`}>
                    {STATUS_LABELS[opp.status]}
                  </Badge>
                } />
                <DetailRow label="Etapa actual" value={stage?.name} />
                <DetailRow
                  label="Valor"
                  value={
                    canEdit && editingValue ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          value={valueInput}
                          onChange={(e) => setValueInput(e.target.value)}
                          className="w-28 h-7 rounded border border-input bg-background px-2 text-sm"
                          autoFocus
                        />
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={handleValueSave} disabled={isPending}>
                          OK
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingValue(false)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <span
                        className={`${canEdit ? "cursor-pointer hover:text-primary" : ""} font-semibold`}
                        onClick={() => canEdit && setEditingValue(true)}
                        title={canEdit ? "Clic para editar" : undefined}
                      >
                        {formatCurrency(opp.monetaryValue)}
                        {canEdit && <span className="ml-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100">(editar)</span>}
                      </span>
                    )
                  }
                />
                <DetailRow
                  label="Creado"
                  value={new Date(opp.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                />
                <DetailRow
                  label="Última actualización"
                  value={new Date(opp.updatedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                />
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: historial */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Historial de cambios
                {timeline.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">({timeline.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sin cambios registrados todavía.
                </p>
              ) : (
                <div className="space-y-3">
                  {timeline.map((entry) => {
                    if (entry.type === "log") {
                      const log = entry.item;
                      return (
                        <div key={`log-${log.id}`} className="flex items-start gap-3">
                          <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <TrendingUp className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{log.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {log.user_name} · {new Date(log.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    } else {
                      const note = entry.item;
                      return (
                        <div key={`note-${note.id}`} className="flex items-start gap-3">
                          <div className="mt-0.5 h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                            <MessageSquare className="h-3 w-3 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm whitespace-pre-line">{note.body}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Nota GHL · {new Date(note.dateAdded).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo de matrícula */}
      <Dialog open={enrollDialog.open} onOpenChange={(open) => !open && setEnrollDialog({ open: false, lead: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Matricular alumno</DialogTitle>
          </DialogHeader>
          {enrollDialog.lead && (
            <LeadToStudentForm
              lead={enrollDialog.lead}
              courses={courses}
              onSuccess={() => setEnrollDialog({ open: false, lead: null })}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
