"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { FollowupWithJoins } from "@/lib/data/followups.repository";
import {
  CONTACT_TYPE_LABELS,
  FOLLOWUP_STATUS_LABELS,
} from "@/lib/domain/followups/schema";
import type { FollowupStudentStatus } from "@/types/database.types";

const STATUS_VARIANT: Record<FollowupStudentStatus, string> = {
  activo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  sin_actividad: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  riesgo_abandono: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  finalizado: "",
};

export function getFollowupColumns(showTutor: boolean): ColumnDef<FollowupWithJoins>[] {
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
    ...(showTutor
      ? [
          {
            id: "tutor",
            header: "Tutor",
            cell: ({ row }: { row: { original: FollowupWithJoins } }) =>
              row.original.tutors?.users?.full_name ?? "—",
          } satisfies ColumnDef<FollowupWithJoins>,
        ]
      : []),
    {
      id: "contact_type",
      header: "Contacto",
      cell: ({ row }) => CONTACT_TYPE_LABELS[row.original.contact_type],
    },
    {
      id: "student_status",
      header: "Estado alumno",
      cell: ({ row }) => (
        <Badge className={STATUS_VARIANT[row.original.student_status_snapshot]}>
          {FOLLOWUP_STATUS_LABELS[row.original.student_status_snapshot]}
        </Badge>
      ),
    },
    {
      accessorKey: "notes",
      header: "Notas",
      cell: ({ row }) => {
        const notes = row.original.notes;
        return notes.length > 80 ? `${notes.slice(0, 80)}…` : notes;
      },
    },
    {
      id: "date",
      header: "Fecha",
      cell: ({ row }) =>
        new Date(row.original.followup_date).toLocaleDateString("es-ES"),
    },
  ];
}
