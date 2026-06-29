"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, ExternalLink, FileCheck2, FileText, Hash } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { ContractBasic, EnrollmentWithCourse, EnrollmentWithStudent } from "@/lib/data/enrollments.repository";
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_TRANSITIONS,
  getTransitionLabel,
} from "@/lib/domain/enrollments/schema";
import type { ContractStatus, EnrollmentStatus } from "@/types/database.types";

const STATUS_VARIANT: Record<EnrollmentStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  validada: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  activa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  finalizada: "",
  cancelada: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const CONTRACT_STATUS_VARIANT: Record<ContractStatus, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  enviado: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  firmado: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  anulado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  firmado: "Firmado",
  anulado: "Anulado",
};

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  return (
    <Badge className={STATUS_VARIANT[status]}>
      {ENROLLMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

function ContractCell({ contract }: { contract: ContractBasic | undefined }) {
  if (!contract) return <span className="text-muted-foreground text-sm">—</span>;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge className={CONTRACT_STATUS_VARIANT[contract.status]}>
        {contract.status === "firmado" ? (
          <FileCheck2 className="mr-1 h-3 w-3" />
        ) : (
          <FileText className="mr-1 h-3 w-3" />
        )}
        {CONTRACT_STATUS_LABELS[contract.status]}
      </Badge>
      <span className="text-sm font-medium">
        {contract.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
      </span>
      {contract.document_url && (
        <a
          href={contract.document_url}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground"
          title="Ver documento firmado"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

// Columnas para la ficha del alumno (sin columna de alumno)
export function getEnrollmentColumns(
  canEdit: boolean,
  onManage?: (enrollment: EnrollmentWithCourse) => void
): ColumnDef<EnrollmentWithCourse>[] {
  return [
    {
      accessorKey: "enrollment_number",
      header: "Nº",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 rounded px-1.5 py-0.5 font-mono">
          <Hash className="h-3 w-3" />{row.original.enrollment_number}
        </span>
      ),
    },
    {
      id: "course",
      header: "Curso",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {row.original.courses?.name ?? "—"}
          </span>
          <Link
            href={`/enrollments/${row.original.id}`}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <ClipboardList className="h-3 w-3" />
            Ficha
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Fecha de matrícula",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
}

// Columnas para la página global /enrollments (con columna de alumno)
export function getGlobalEnrollmentColumns(
  canEdit: boolean,
  onTransition: (enrollment: EnrollmentWithStudent, next: EnrollmentStatus) => void,
  onAssignTutor: (enrollment: EnrollmentWithStudent) => void,
  canViewStudents = true
): ColumnDef<EnrollmentWithStudent>[] {
  return [
    {
      accessorKey: "enrollment_number",
      header: "Nº",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 rounded px-1.5 py-0.5 font-mono">
          <Hash className="h-3 w-3" />{row.original.enrollment_number}
        </span>
      ),
    },
    {
      id: "student",
      header: "Alumno",
      cell: ({ row }) => {
        const student = row.original.students;
        if (!student) return "—";
        if (canViewStudents) {
          return (
            <Link href={`/students/${student.id}`} className="font-medium hover:underline">
              {student.full_name}
            </Link>
          );
        }
        return <span className="font-medium">{student.full_name}</span>;
      },
    },
    {
      id: "course",
      header: "Curso",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {row.original.courses?.name ?? "—"}
          </span>
          <Link
            href={`/enrollments/${row.original.id}`}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <ClipboardList className="h-3 w-3" />
            Ficha
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Fecha de matrícula",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "contract",
      header: "Contrato",
      cell: ({ row }) => (
        <ContractCell contract={row.original.contracts?.[0]} />
      ),
    },
    {
      id: "assignment",
      header: "Plataforma / Tutor",
      cell: ({ row }) => {
        const platform = row.original.platforms?.name;
        const tutor = row.original.tutors?.users?.full_name;
        if (!platform && !tutor) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex flex-col gap-0.5 text-sm">
            {platform && <span>{platform}</span>}
            {tutor && <span className="text-muted-foreground">{tutor}</span>}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (!canEdit) return null;
        const enrollment = row.original;
        const nextStatuses = ENROLLMENT_STATUS_TRANSITIONS[enrollment.status];
        const showAssign = enrollment.status === "validada";
        if (nextStatuses.length === 0 && !showAssign) return null;
        return (
          <div className="flex gap-1.5 flex-wrap justify-end">
            {showAssign && (
              <button
                onClick={() => onAssignTutor(enrollment)}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ring-1 text-violet-700 bg-violet-50 ring-violet-200 hover:bg-violet-100"
              >
                Asignar Tutor
              </button>
            )}
            {nextStatuses.map((next) => (
              <button
                key={next}
                onClick={() => onTransition(enrollment, next as EnrollmentStatus)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ring-1 ${
                  next === "cancelada"
                    ? "text-red-700 bg-red-50 ring-red-200 hover:bg-red-100"
                    : "text-primary bg-primary/8 ring-primary/20 hover:bg-primary/15 hover:ring-primary/40"
                }`}
              >
                {getTransitionLabel(enrollment.status, next as EnrollmentStatus)}
              </button>
            ))}
          </div>
        );
      },
    },
  ];
}
