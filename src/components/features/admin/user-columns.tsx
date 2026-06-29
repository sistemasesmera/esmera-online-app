"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useTransition } from "react";
import { toast } from "sonner";

import { toggleUserActive } from "@/app/(app)/admin/users/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserRow } from "@/lib/data/users.repository";
import { ROLE_LABELS } from "@/lib/domain/shared/permissions";

function ToggleActiveCell({ user }: { user: UserRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleUserActive(user.id, !user.is_active);
          if (result.error) toast.error(result.error);
        })
      }
    >
      {user.is_active ? "Desactivar" : "Activar"}
    </Button>
  );
}

export function getUserColumns(onEdit: (user: UserRow) => void): ColumnDef<UserRow>[] {
  return [
    {
      accessorKey: "full_name",
      header: "Nombre",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) => <Badge variant="outline">{ROLE_LABELS[row.original.role]}</Badge>,
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => row.original.phone ?? "—",
    },
    {
      accessorKey: "is_active",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
            Editar
          </Button>
          <ToggleActiveCell user={row.original} />
        </div>
      ),
    },
  ];
}
