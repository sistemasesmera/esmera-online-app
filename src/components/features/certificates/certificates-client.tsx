"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { usePersistedPageSize } from "@/hooks/use-persisted-page-size";

import { getCertificateColumns } from "@/components/features/certificates/certificate-columns";
import { CertificateForm } from "@/components/features/certificates/certificate-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CertificateWithJoins, EnrollmentForCertificate } from "@/lib/data/certificates.repository";
import { CERT_STATUS_LABELS } from "@/lib/domain/certificates/schema";
import type { CertificateStatus } from "@/types/database.types";

const ALL_STATUSES = Object.entries(CERT_STATUS_LABELS) as [CertificateStatus, string][];

export function CertificatesClient({
  certificates,
  enrollments,
  canEdit,
}: {
  certificates: CertificateWithJoins[];
  enrollments: EnrollmentForCertificate[];
  canEdit: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | "">("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("esmera:pageSize:certificates");

  useEffect(() => { setPageIndex(0); }, [search, statusFilter, pageSize]);

  const filtered = certificates.filter((c) => {
    const name = c.enrollments?.students?.full_name ?? "";
    const course = c.enrollments?.courses?.name ?? "";
    const matchSearch =
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      course.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const columns = getCertificateColumns(canEdit);

  return (
    <>
      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por alumno o curso…"
          filters={
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CertificateStatus | "")}
            >
              <option value="">Todos los estados</option>
              {ALL_STATUSES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          }
          actions={
            canEdit ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Nuevo certificado
              </Button>
            ) : undefined
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={pageData}
        pagination={{ pageIndex, pageCount, onPageChange: setPageIndex, pageSize, onPageSizeChange: setPageSize }}
      />

      {canEdit && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo certificado</DialogTitle>
            </DialogHeader>
            <CertificateForm
              key="create"
              enrollments={enrollments}
              onSuccess={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
