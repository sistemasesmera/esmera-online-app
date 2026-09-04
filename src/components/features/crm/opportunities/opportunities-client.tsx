"use client";

import { useState, useTransition } from "react";
import { Kanban, List } from "lucide-react";
import { toast } from "sonner";

import { findLeadForOpportunity, updateOpportunityStatus } from "@/app/(app)/crm/opportunities/actions";
import { LeadToStudentForm } from "@/components/features/crm/leads/lead-to-student-form";
import { OpportunitiesKanban } from "@/components/features/crm/opportunities/opportunities-kanban";
import { OpportunitiesTable } from "@/components/features/crm/opportunities/opportunities-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseRow } from "@/lib/data/courses.repository";
import type { GhlOpportunityEnriched, GhlPipeline } from "@/lib/data/ghl-opportunities.repository";
import type { LeadWithJoins } from "@/lib/data/leads.repository";

type View = "kanban" | "table";
type StatusFilter = "open" | "won" | "lost" | "all";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Abiertas" },
  { value: "won", label: "Ganadas" },
  { value: "lost", label: "Perdidas" },
  { value: "all", label: "Todas" },
];

export function OpportunitiesClient({
  pipelines,
  opportunitiesByPipeline,
  courses,
  canEdit,
}: {
  pipelines: GhlPipeline[];
  opportunitiesByPipeline: Record<string, GhlOpportunityEnriched[]>;
  courses: CourseRow[];
  canEdit: boolean;
}) {
  const [view, setView] = useState<View>("kanban");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(pipelines[0]?.id ?? "");

  const [enrollDialog, setEnrollDialog] = useState<{
    open: boolean;
    lead: LeadWithJoins | null;
  }>({ open: false, lead: null });
  const [isFinding, startFinding] = useTransition();

  const pipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const allOpportunities = pipeline ? (opportunitiesByPipeline[pipeline.id] ?? []) : [];

  const opportunities =
    statusFilter === "all"
      ? allOpportunities
      : allOpportunities.filter((o) => o.status === statusFilter);

  function handleEnroll(opp: GhlOpportunityEnriched) {
    if (!opp.contact.phone) {
      startFinding(async () => {
        const res = await updateOpportunityStatus(opp.id, "won", { contactName: opp.contact.name });
        if (res.success) toast.success("Marcado como ganado. Para crear matrícula, ve a Leads.");
        else toast.error(res.error ?? "Error al actualizar");
      });
      return;
    }

    startFinding(async () => {
      const { lead, alreadyConverted } = await findLeadForOpportunity(opp.contact.phone!);

      if (alreadyConverted) {
        await updateOpportunityStatus(opp.id, "won", { contactName: opp.contact.name });
        toast.info("Este contacto ya tiene matrícula. Marcado como ganado en GHL.");
        return;
      }

      if (lead) {
        setEnrollDialog({ open: true, lead });
      } else {
        await updateOpportunityStatus(opp.id, "won", { contactName: opp.contact.name });
        toast.success("Marcado como ganado en GHL. Para crear matrícula, ve a Leads.");
      }
    });
  }

  if (pipelines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        No hay pipelines configurados en GHL.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Barra de controles */}
        <div className="flex items-center gap-3 flex-wrap">
          {pipelines.length > 1 && (
            <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
              <SelectTrigger className="h-9 w-56">
                <SelectValue placeholder="Pipeline…" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Pestañas de estado */}
          <div className="flex items-center gap-1 rounded-md border p-0.5 bg-muted">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === "all"
                  ? allOpportunities.length
                  : allOpportunities.filter((o) => o.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 h-7 rounded text-xs font-medium transition-colors ${
                    statusFilter === tab.value
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Toggle vista */}
          <div className="flex items-center gap-1 ml-auto rounded-md border p-0.5 bg-muted">
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setView("kanban")}
            >
              <Kanban className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setView("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Vista */}
        {pipeline && view === "kanban" && (
          <OpportunitiesKanban
            pipeline={pipeline}
            opportunities={opportunities}
            canEdit={canEdit && !isFinding}
            onEnroll={canEdit ? handleEnroll : undefined}
          />
        )}
        {pipeline && view === "table" && (
          <OpportunitiesTable
            pipeline={pipeline}
            opportunities={opportunities}
            canEdit={canEdit && !isFinding}
            onEnroll={canEdit ? handleEnroll : undefined}
          />
        )}
      </div>

      {/* Diálogo de matrícula */}
      <Dialog
        open={enrollDialog.open}
        onOpenChange={(open) => !open && setEnrollDialog({ open: false, lead: null })}
      >
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
