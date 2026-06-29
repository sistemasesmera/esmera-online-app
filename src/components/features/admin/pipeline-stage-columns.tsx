"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PipelineStageRow } from "@/lib/data/pipeline-stages.repository";

export function getPipelineStageColumns(
  onEdit: (s: PipelineStageRow) => void
): ColumnDef<PipelineStageRow>[] {
  return [
    {
      accessorKey: "display_order",
      header: "Orden",
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">{row.original.display_order}</span>
      ),
    },
    {
      accessorKey: "code",
      header: "Código",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      accessorKey: "is_won",
      header: "Ganada",
      cell: ({ row }) =>
        row.original.is_won ? <Badge className="bg-green-100 text-green-800">Sí</Badge> : null,
    },
    {
      accessorKey: "is_lost",
      header: "Perdida",
      cell: ({ row }) =>
        row.original.is_lost ? <Badge className="bg-red-100 text-red-800">Sí</Badge> : null,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
    },
  ];
}
