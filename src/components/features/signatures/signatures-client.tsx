"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Hash } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { usePersistedPageSize } from "@/hooks/use-persisted-page-size";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import type { SignatureContract } from "@/lib/data/signatures.repository";
import type { ContractStatus } from "@/types/database.types";

const STATUS_VARIANT: Record<ContractStatus, string> = {
  borrador: "bg-slate-100 text-slate-700",
  enviado: "bg-blue-100 text-blue-700",
  firmado: "bg-emerald-100 text-emerald-700",
  anulado: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<ContractStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  firmado: "Firmado",
  anulado: "Anulado",
};

const ALL_STATUSES: [ContractStatus, string][] = [
  ["enviado", "Enviado"],
  ["firmado", "Firmado"],
  ["borrador", "Borrador"],
  ["anulado", "Anulado"],
];

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtEur(n: number): string {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export function SignaturesClient({ contracts }: { contracts: SignatureContract[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "">("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("esmera:pageSize:signatures");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => { setPageIndex(0); }, [search, statusFilter, pageSize]);

  const countEnviado = contracts.filter((c) => c.status === "enviado").length;
  const countFirmado = contracts.filter((c) => c.status === "firmado").length;

  const filtered = contracts.filter((c) => {
    const matchSearch =
      !search ||
      (c.students?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.enrollments?.courses?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  function handleResend(enrollmentId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/enrollments/${enrollmentId}/send-for-signature`, { method: "POST" });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error ?? "Error al reenviar");
        } else {
          toast.success("Contrato reenviado correctamente");
          router.refresh();
        }
      } catch {
        toast.error("Error al reenviar el contrato");
      }
    });
  }

  const columns: ColumnDef<SignatureContract>[] = [
    {
      id: "numero",
      header: "Nº",
      cell: ({ row }) => {
        const num = row.original.enrollments?.enrollment_number;
        const eId = row.original.enrollment_id;
        return (
          <Link
            href={`/enrollments/${eId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 rounded px-1.5 py-0.5 font-mono hover:bg-indigo-100 transition-colors"
          >
            <Hash className="h-3 w-3" />{num ?? "—"}
          </Link>
        );
      },
    },
    {
      id: "alumno",
      header: "Alumno",
      cell: ({ row }) => {
        const student = row.original.students;
        return (
          <div>
            <p className="font-medium">{student?.full_name ?? "—"}</p>
            {student?.email && (
              <p className="text-xs text-muted-foreground">{student.email}</p>
            )}
          </div>
        );
      },
    },
    {
      id: "curso",
      header: "Curso",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.enrollments?.courses?.name ?? "—"}</span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="flex items-center gap-1.5">
            {status === "enviado" && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            )}
            <Badge className={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
          </div>
        );
      },
    },
    {
      id: "enviado_el",
      header: "Enviado el",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{fmtDate(row.original.sent_at)}</span>
      ),
    },
    {
      id: "firmado_el",
      header: "Firmado el",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{fmtDate(row.original.signed_at)}</span>
      ),
    },
    {
      id: "importe",
      header: "Importe",
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">{fmtEur(row.original.amount)}</span>
      ),
    },
    {
      id: "documento",
      header: "Documento",
      cell: ({ row }) => {
        const { document_url, status } = row.original;
        if (status !== "firmado" || !document_url) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <a
            href={document_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded px-2 py-1 hover:bg-emerald-100 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver PDF
          </a>
        );
      },
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => {
        const { status, enrollment_id } = row.original;
        if (status !== "enviado") return null;
        return (
          <button
            onClick={() => handleResend(enrollment_id)}
            disabled={isPending}
            className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ring-1 text-indigo-700 bg-indigo-50 ring-indigo-200 hover:bg-indigo-100 disabled:opacity-50"
          >
            Reenviar
          </button>
        );
      },
    },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="flex items-center gap-3 rounded-xl border p-4 bg-card">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
            </span>
          </div>
          <div>
            <p className="text-2xl font-black leading-none text-blue-700">{countEnviado}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pendientes de firma</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border p-4 bg-card">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">
            ✓
          </div>
          <div>
            <p className="text-2xl font-black leading-none text-emerald-700">{countFirmado}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Firmados</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border p-4 bg-card">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
            #
          </div>
          <div>
            <p className="text-2xl font-black leading-none">{contracts.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total contratos</p>
          </div>
        </div>
      </div>

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por alumno o curso…"
        filters={
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContractStatus | "")}
          >
            <option value="">Todos los estados</option>
            {ALL_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        }
      />

      <DataTable
        columns={columns}
        data={pageData}
        pagination={{ pageIndex, pageCount, onPageChange: setPageIndex, pageSize, onPageSizeChange: setPageSize }}
      />
    </>
  );
}
