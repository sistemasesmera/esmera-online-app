"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { getPipelineStageColumns } from "@/components/features/admin/pipeline-stage-columns";
import { PipelineStageForm } from "@/components/features/admin/pipeline-stage-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PipelineStageRow } from "@/lib/data/pipeline-stages.repository";

export function PipelineStagesClient({ stages }: { stages: PipelineStageRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStageRow | null>(null);

  const columns = getPipelineStageColumns(setEditingStage);

  return (
    <>
      <DataTableToolbar
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Nueva etapa
          </Button>
        }
      />
      <DataTable columns={columns} data={stages} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva etapa</DialogTitle>
          </DialogHeader>
          <PipelineStageForm key="create" onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar etapa</DialogTitle>
          </DialogHeader>
          {editingStage && (
            <PipelineStageForm
              key={editingStage.id}
              stage={editingStage}
              onSuccess={() => setEditingStage(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
