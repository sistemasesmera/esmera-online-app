"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlatformRow } from "@/lib/data/platforms.repository";

export function getPlatformColumns(onEdit: (p: PlatformRow) => void): ColumnDef<PlatformRow>[] {
  return [
    {
      accessorKey: "code",
      header: "Código",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      accessorKey: "is_active",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
    },
  ];
}
