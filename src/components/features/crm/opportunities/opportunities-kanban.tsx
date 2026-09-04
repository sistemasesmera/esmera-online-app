"use client";

import { useState, useTransition } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { moveOpportunityStage } from "@/app/(app)/crm/opportunities/actions";
import { OpportunityCard } from "@/components/features/crm/opportunities/opportunity-card";
import type { GhlOpportunityEnriched, GhlPipeline, GhlPipelineStage } from "@/lib/data/ghl-opportunities.repository";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

/* ── Tarjeta draggable ── */
function DraggableCard({
  opp, canEdit, onEnroll, isDragOverlay = false,
}: {
  opp: GhlOpportunityEnriched;
  canEdit: boolean;
  onEnroll?: (opp: GhlOpportunityEnriched) => void;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opp.id,
    disabled: !canEdit,
    data: { opp },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={isDragging && !isDragOverlay ? "opacity-40" : ""}>
      <OpportunityCard
        opp={opp}
        canEdit={canEdit}
        onEnroll={onEnroll}
        dragHandleProps={canEdit ? { ...attributes, ...listeners } : undefined}
        isDragOverlay={isDragOverlay}
      />
    </div>
  );
}

/* ── Columna droppable ── */
function KanbanColumn({
  stage, opportunities, canEdit, onEnroll,
}: {
  stage: GhlPipelineStage;
  opportunities: GhlOpportunityEnriched[];
  canEdit: boolean;
  onEnroll?: (opp: GhlOpportunityEnriched) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = opportunities.reduce((s, o) => s + (o.monetaryValue ?? 0), 0);

  return (
    <div className="flex flex-col gap-2 min-w-[260px] w-64 shrink-0">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold truncate">{stage.name}</span>
        <span className="text-xs text-muted-foreground ml-2 shrink-0">
          {opportunities.length}{total > 0 ? ` · ${formatCurrency(total)}` : ""}
        </span>
      </div>
      <div className={`h-1 rounded-full transition-colors ${isOver ? "bg-primary" : "bg-border"}`} />

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[120px] rounded-lg p-1.5 transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
        }`}
      >
        {opportunities.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-center text-xs text-muted-foreground">
            Sin oportunidades
          </div>
        ) : (
          opportunities.map((opp) => (
            <DraggableCard key={opp.id} opp={opp} canEdit={canEdit} onEnroll={onEnroll} />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Board principal ── */
export function OpportunitiesKanban({
  pipeline, opportunities, canEdit, onEnroll,
}: {
  pipeline: GhlPipeline;
  opportunities: GhlOpportunityEnriched[];
  canEdit: boolean;
  onEnroll?: (opp: GhlOpportunityEnriched) => void;
}) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [activeOpp, setActiveOpp] = useState<GhlOpportunityEnriched | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const stagesSorted = [...pipeline.stages].sort((a, b) => a.position - b.position);

  const oppsByStage = new Map<string, GhlOpportunityEnriched[]>(stagesSorted.map((s) => [s.id, []]));
  for (const opp of opportunities) {
    const effectiveStageId = overrides[opp.id] ?? opp.pipelineStageId;
    if (!oppsByStage.has(effectiveStageId)) oppsByStage.set(effectiveStageId, []);
    oppsByStage.get(effectiveStageId)!.push(opp);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveOpp(opportunities.find((o) => o.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveOpp(null);
    const { active, over } = event;
    if (!over) return;
    const opportunityId = active.id as string;
    const newStageId = over.id as string;
    const opp = opportunities.find((o) => o.id === opportunityId);
    const currentStageId = overrides[opportunityId] ?? opp?.pipelineStageId;
    if (!opp || newStageId === currentStageId) return;

    const fromStage = stagesSorted.find((s) => s.id === currentStageId);
    const toStage = stagesSorted.find((s) => s.id === newStageId);

    setOverrides((prev) => ({ ...prev, [opportunityId]: newStageId }));

    startTransition(async () => {
      const res = await moveOpportunityStage(opportunityId, newStageId, {
        contactName: opp.contact.name,
        fromStageName: fromStage?.name,
        toStageName: toStage?.name,
      });
      if (!res.success) {
        setOverrides((prev) => { const n = { ...prev }; delete n[opportunityId]; return n; });
        toast.error(res.error ?? "Error al mover");
      } else {
        toast.success(`"${opp.contact.name}" → ${toStage?.name}`);
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`flex gap-4 overflow-x-auto pb-4 min-h-[60vh] ${isPending ? "pointer-events-none" : ""}`}>
        {stagesSorted.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            opportunities={oppsByStage.get(stage.id) ?? []}
            canEdit={canEdit}
            onEnroll={onEnroll}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeOpp && <DraggableCard opp={activeOpp} canEdit={false} isDragOverlay />}
      </DragOverlay>
    </DndContext>
  );
}
