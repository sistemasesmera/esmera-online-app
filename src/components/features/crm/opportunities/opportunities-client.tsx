"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { usePersistedPageSize } from "@/hooks/use-persisted-page-size";

import { getOpportunityColumns } from "@/components/features/crm/opportunities/opportunity-columns";
import { OpportunityForm } from "@/components/features/crm/opportunities/opportunity-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CourseRow } from "@/lib/data/courses.repository";
import type { LeadRow } from "@/lib/data/leads.repository";
import type { OpportunityWithJoins } from "@/lib/data/opportunities.repository";
import type { PipelineStageRow } from "@/lib/data/pipeline-stages.repository";
import type { UserRow } from "@/lib/data/users.repository";

export function OpportunitiesClient({
  opportunities,
  leads,
  stages,
  courses,
  users,
  currentUserId,
  canEdit,
}: {
  opportunities: OpportunityWithJoins[];
  leads: LeadRow[];
  stages: PipelineStageRow[];
  courses: CourseRow[];
  users: UserRow[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<OpportunityWithJoins | null>(null);
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("esmera:pageSize:opportunities");

  useEffect(() => { setPageIndex(0); }, [search, pageSize]);

  const filtered = opportunities.filter((o) => {
    if (!search) return true;
    return (
      (o.leads?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.pipeline_stages?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const columns = getOpportunityColumns(setEditingOpp);

  return (
    <>
      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por lead o etapa…"
          actions={
            canEdit ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Nueva oportunidad
              </Button>
            ) : undefined
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={pageData}
        pagination={{ pageIndex, pageCount, onPageChange: setPageIndex, pageSize, onPageSizeChange: setPageSize }}
      />

      {canEdit && (
        <>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nueva oportunidad</DialogTitle></DialogHeader>
              <OpportunityForm
                key="create"
                leads={leads}
                stages={stages}
                courses={courses}
                users={users}
                currentUserId={currentUserId}
                onSuccess={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingOpp} onOpenChange={(open) => !open && setEditingOpp(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Editar oportunidad</DialogTitle></DialogHeader>
              {editingOpp && (
                <OpportunityForm
                  key={editingOpp.id}
                  opportunity={editingOpp}
                  leads={leads}
                  stages={stages}
                  courses={courses}
                  users={users}
                  currentUserId={currentUserId}
                  onSuccess={() => setEditingOpp(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
