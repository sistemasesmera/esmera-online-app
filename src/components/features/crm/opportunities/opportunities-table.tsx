"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, UserPlus, XCircle, RotateCcw } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { updateOpportunityStatus } from "@/app/(app)/crm/opportunities/actions";
import { STATUS_LABELS, STATUS_COLORS } from "@/components/features/crm/opportunities/opportunity-card";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePersistedPageSize } from "@/hooks/use-persisted-page-size";
import type { GhlOpportunityEnriched, GhlPipeline } from "@/lib/data/ghl-opportunities.repository";

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function ActionsCell({
  opp, canEdit, onEnroll,
}: {
  opp: GhlOpportunityEnriched;
  canEdit: boolean;
  onEnroll?: (opp: GhlOpportunityEnriched) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isOpen = opp.status === "open";
  const isTerminal = opp.status === "won" || opp.status === "lost";

  function handleLost() {
    startTransition(async () => {
      const res = await updateOpportunityStatus(opp.id, "lost", { contactName: opp.contact.name, fromStatus: opp.status });
      if (!res.success) toast.error(res.error ?? "Error");
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const res = await updateOpportunityStatus(opp.id, "open", { contactName: opp.contact.name, fromStatus: opp.status });
      if (!res.success) toast.error(res.error ?? "Error");
    });
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
        <Link href={`/crm/opportunities/${opp.id}`}>
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          Ver
        </Link>
      </Button>
      {canEdit && isOpen && (
        <>
          <Button
            size="sm"
            className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
            disabled={isPending}
            onClick={() => onEnroll?.(opp)}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Matricular
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
            disabled={isPending}
            onClick={handleLost}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Perdido
          </Button>
        </>
      )}
      {canEdit && isTerminal && (
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={isPending} onClick={handleReopen}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reabrir
        </Button>
      )}
    </div>
  );
}

function buildColumns(
  stageNameById: Map<string, string>,
  canEdit: boolean,
  onEnroll?: (opp: GhlOpportunityEnriched) => void
): ColumnDef<GhlOpportunityEnriched>[] {
  return [
    {
      id: "contact",
      header: "Contacto",
      cell: ({ row }) => <span className="font-medium">{row.original.contact.name}</span>,
    },
    {
      id: "phone",
      header: "Teléfono",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.contact.phone ?? "—"}</span>,
    },
    {
      id: "stage",
      header: "Etapa",
      cell: ({ row }) => stageNameById.get(row.original.pipelineStageId) ?? "—",
    },
    {
      id: "status",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[row.original.status]}`}>
          {STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "value",
      header: "Valor",
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.monetaryValue)}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell opp={row.original} canEdit={canEdit} onEnroll={onEnroll} />,
    },
  ];
}

export function OpportunitiesTable({
  pipeline, opportunities, canEdit, onEnroll,
}: {
  pipeline: GhlPipeline;
  opportunities: GhlOpportunityEnriched[];
  canEdit: boolean;
  onEnroll?: (opp: GhlOpportunityEnriched) => void;
}) {
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("esmera:pageSize:opportunities");

  const stageNameById = new Map(pipeline.stages.map((s) => [s.id, s.name]));
  const stagesSorted = [...pipeline.stages].sort((a, b) => a.position - b.position);

  const filtered = opportunities.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.contact.name.toLowerCase().includes(q) ||
      (o.contact.phone ?? "").includes(q) ||
      (o.contact.email ?? "").toLowerCase().includes(q) ||
      (stageNameById.get(o.pipelineStageId) ?? "").toLowerCase().includes(q)
    );
  });

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const columns = buildColumns(stageNameById, canEdit, onEnroll);

  return (
    <>
      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPageIndex(0); }}
          searchPlaceholder="Buscar por contacto, teléfono, email o etapa…"
        />
      </div>
      <DataTable
        columns={columns}
        data={pageData}
        pagination={{ pageIndex, pageCount, onPageChange: setPageIndex, pageSize, onPageSizeChange: setPageSize }}
      />
    </>
  );
}
