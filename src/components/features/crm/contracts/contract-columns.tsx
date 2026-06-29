"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { ContractStatusActions } from "@/components/features/crm/contracts/contract-status-actions";
import { Badge } from "@/components/ui/badge";
import type { ContractWithJoins } from "@/lib/data/contracts.repository";
import { CONTRACT_STATUS_LABELS } from "@/lib/domain/contracts/schema";
import type { ContractStatus } from "@/types/database.types";

const STATUS_VARIANT: Record<ContractStatus, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  enviado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  firmado: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  anulado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
}

export function getContractColumns(canEdit: boolean): ColumnDef<ContractWithJoins>[] {
  return [
    {
      id: "contact",
      header: "Contacto",
      cell: ({ row }) => {
        const student = row.original.students?.full_name;
        const lead = row.original.opportunities?.leads?.full_name;
        return <span className="font-medium">{student ?? lead ?? "—"}</span>;
      },
    },
    {
      id: "amount",
      header: "Importe",
      cell: ({ row }) => formatAmount(row.original.amount),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <Badge className={STATUS_VARIANT[row.original.status]}>
          {CONTRACT_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "signed_at",
      header: "Firmado",
      cell: ({ row }) =>
        row.original.signed_at
          ? new Date(row.original.signed_at).toLocaleDateString("es-ES")
          : "—",
    },
    {
      id: "document",
      header: "Documento",
      cell: ({ row }) =>
        row.original.document_url ? (
          <a href={row.original.document_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">
            Ver doc.
          </a>
        ) : (
          "—"
        ),
    },
    ...(canEdit
      ? [
          {
            id: "actions",
            header: "Acciones",
            cell: ({ row }: { row: { original: ContractWithJoins } }) => (
              <ContractStatusActions contract={row.original} />
            ),
          } satisfies ColumnDef<ContractWithJoins>,
        ]
      : []),
  ];
}
