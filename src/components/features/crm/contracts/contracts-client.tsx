"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { getContractColumns } from "@/components/features/crm/contracts/contract-columns";
import { ContractForm } from "@/components/features/crm/contracts/contract-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ContractWithJoins } from "@/lib/data/contracts.repository";
import type { StudentRow } from "@/lib/data/students.repository";
import { CONTRACT_STATUS_LABELS } from "@/lib/domain/contracts/schema";
import type { ContractStatus } from "@/types/database.types";

const ALL_STATUSES = Object.entries(CONTRACT_STATUS_LABELS) as [ContractStatus, string][];

const PAGE_SIZE = 20;

export function ContractsClient({
  contracts,
  students,
  canCreate,
  canEdit,
}: {
  contracts: ContractWithJoins[];
  students: StudentRow[];
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "">("");
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => { setPageIndex(0); }, [search, statusFilter]);

  const filtered = contracts.filter((c) => {
    const name = c.students?.full_name ?? "";
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  const columns = getContractColumns(canEdit);

  return (
    <>
      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por alumno…"
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
          actions={
            canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Nuevo contrato
              </Button>
            ) : undefined
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={pageData}
        pagination={{ pageIndex, pageCount, onPageChange: setPageIndex }}
      />

      {canCreate && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nuevo contrato</DialogTitle></DialogHeader>
            <ContractForm
              key="create"
              students={students}
              onSuccess={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
