"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import type { OpportunityWithJoins } from "@/lib/data/opportunities.repository";

function formatAmount(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
}

export function getOpportunityColumns(onEdit: (opp: OpportunityWithJoins) => void): ColumnDef<OpportunityWithJoins>[] {
  return [
    {
      id: "lead",
      header: "Lead",
      cell: ({ row }) => <span className="font-medium">{row.original.leads?.full_name ?? "—"}</span>,
    },
    {
      id: "stage",
      header: "Etapa",
      cell: ({ row }) => row.original.pipeline_stages?.name ?? "—",
    },
    {
      id: "course",
      header: "Curso",
      cell: ({ row }) => row.original.courses?.name ?? "—",
    },
    {
      id: "amount",
      header: "Importe est.",
      cell: ({ row }) => formatAmount(row.original.estimated_amount),
    },
    {
      id: "owner",
      header: "Propietario",
      cell: ({ row }) => row.original.users?.full_name ?? "—",
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
