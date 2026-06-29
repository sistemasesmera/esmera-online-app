"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { CertificateStatusActions } from "@/components/features/certificates/certificate-status-actions";
import { Badge } from "@/components/ui/badge";
import type { CertificateWithJoins } from "@/lib/data/certificates.repository";
import { CERT_STATUS_LABELS } from "@/lib/domain/certificates/schema";
import type { CertificateStatus } from "@/types/database.types";

const STATUS_VARIANT: Record<CertificateStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  emitido: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  anulado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function getCertificateColumns(canEdit: boolean): ColumnDef<CertificateWithJoins>[] {
  return [
    {
      id: "student",
      header: "Alumno",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.enrollments?.students?.full_name ?? "—"}
        </span>
      ),
    },
    {
      id: "course",
      header: "Curso",
      cell: ({ row }) => row.original.enrollments?.courses?.name ?? "—",
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <Badge className={STATUS_VARIANT[row.original.status]}>
          {CERT_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "issued_at",
      header: "Emitido el",
      cell: ({ row }) =>
        row.original.issued_at
          ? new Date(row.original.issued_at).toLocaleDateString("es-ES")
          : "—",
    },
    {
      id: "issued_by",
      header: "Emitido por",
      cell: ({ row }) => row.original.users?.full_name ?? "—",
    },
    {
      id: "document",
      header: "Documento",
      cell: ({ row }) =>
        row.original.document_url ? (
          <a
            href={row.original.document_url}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline text-sm"
          >
            Ver PDF
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
            cell: ({ row }: { row: { original: CertificateWithJoins } }) => (
              <CertificateStatusActions certificate={row.original} />
            ),
          } satisfies ColumnDef<CertificateWithJoins>,
        ]
      : []),
  ];
}
