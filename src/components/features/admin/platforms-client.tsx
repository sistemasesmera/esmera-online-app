"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { getPlatformColumns } from "@/components/features/admin/platform-columns";
import { PlatformForm } from "@/components/features/admin/platform-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PlatformRow } from "@/lib/data/platforms.repository";

export function PlatformsClient({ platforms }: { platforms: PlatformRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<PlatformRow | null>(null);

  const columns = getPlatformColumns(setEditingPlatform);

  return (
    <>
      <DataTableToolbar
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Nueva plataforma
          </Button>
        }
      />
      <DataTable columns={columns} data={platforms} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plataforma</DialogTitle>
          </DialogHeader>
          <PlatformForm key="create" onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlatform} onOpenChange={(open) => !open && setEditingPlatform(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plataforma</DialogTitle>
          </DialogHeader>
          {editingPlatform && (
            <PlatformForm
              key={editingPlatform.id}
              platform={editingPlatform}
              onSuccess={() => setEditingPlatform(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
