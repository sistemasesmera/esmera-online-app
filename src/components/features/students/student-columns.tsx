"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Hash, User } from "lucide-react";
import Link from "next/link";

import type { StudentWithComercial } from "@/lib/data/students.repository";

export function getStudentColumns(): ColumnDef<StudentWithComercial>[] {
  return [
    {
      accessorKey: "student_number",
      header: "Nº",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 rounded px-1.5 py-0.5 font-mono">
          <Hash className="h-3 w-3" />{row.original.student_number}
        </span>
      ),
    },
    {
      accessorKey: "full_name",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.full_name}</span>
      ),
    },
    {
      accessorKey: "dni_nie",
      header: "DNI / NIE",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">{row.original.dni_nie}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      id: "assigned_user",
      header: "Comercial asignado",
      cell: ({ row }) => {
        const name = row.original.assigned_user?.full_name;
        return name ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">Sin asignar</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Alta",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {new Date(row.original.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link
          href={`/students/${row.original.id}`}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 transition-colors cursor-pointer ring-1 ring-primary/20 hover:ring-primary/40"
        >
          Ver ficha
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];
}
