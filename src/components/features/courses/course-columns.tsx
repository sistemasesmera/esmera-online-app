"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CourseRow } from "@/lib/data/courses.repository";

export function getCourseColumns(onEdit?: (c: CourseRow) => void): ColumnDef<CourseRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "code",
      header: "Código",
      cell: ({ row }) =>
        row.original.code ? (
          <span className="font-mono text-sm text-muted-foreground">{row.original.code}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "duration_hours",
      header: "Horas",
      cell: ({ row }) =>
        row.original.duration_hours != null ? (
          <span className="text-muted-foreground">{row.original.duration_hours} h</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "dossier_url",
      header: "Dossier",
      cell: ({ row }) =>
        row.original.dossier_url ? (
          <a
            href={row.original.dossier_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <FileText className="h-3.5 w-3.5 text-red-500" />
            Ver PDF
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      accessorKey: "is_active",
      header: "Estado",
      cell: ({ row }) => (
        <Badge className={
          row.original.is_active
            ? "text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800"
            : "text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
        }>
          {row.original.is_active ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    ...(onEdit
      ? [
          {
            id: "actions",
            cell: ({ row }: { row: { original: CourseRow } }) => (
              <button
                onClick={() => onEdit(row.original)}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 transition-colors cursor-pointer ring-1 ring-primary/20 hover:ring-primary/40"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            ),
          } satisfies ColumnDef<CourseRow>,
        ]
      : []),
  ];
}
