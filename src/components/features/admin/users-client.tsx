"use client";

import { Download, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { usePersistedPageSize } from "@/hooks/use-persisted-page-size";

import { UserForm } from "@/components/features/admin/user-form";
import { getUserColumns } from "@/components/features/admin/user-columns";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserRow } from "@/lib/data/users.repository";

export function UsersClient({ users }: { users: UserRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("esmera:pageSize:users");
  const [isDownloadingContract, setIsDownloadingContract] = useState(false);

  async function handleDownloadBlankContract() {
    setIsDownloadingContract(true);
    try {
      const res = await fetch("/api/contracts/blank");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "contrato-en-blanco.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // silencioso — el usuario verá que no descargó nada
    } finally {
      setIsDownloadingContract(false);
    }
  }

  useEffect(() => { setPageIndex(0); }, [search, pageSize]);

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const columns = getUserColumns(setEditingUser);

  return (
    <>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre o email…"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isDownloadingContract}
              onClick={handleDownloadBlankContract}
            >
              <Download className="mr-1 h-4 w-4" />
              {isDownloadingContract ? "Generando…" : "Contrato en blanco"}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Nuevo usuario
            </Button>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={pageData}
        pagination={{ pageIndex, pageCount, onPageChange: setPageIndex, pageSize, onPageSizeChange: setPageSize }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          <UserForm key="create" onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <UserForm
              key={editingUser.id}
              user={editingUser}
              onSuccess={() => setEditingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
