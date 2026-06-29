"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyState,
  pagination,
  rowSelection,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyState?: ReactNode;
  pagination?: {
    pageIndex: number;
    pageCount: number;
    onPageChange: (pageIndex: number) => void;
  };
  rowSelection?: {
    state: RowSelectionState;
    onChange: Dispatch<SetStateAction<RowSelectionState>>;
    getRowId: (row: TData) => string;
  };
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(rowSelection && {
      enableRowSelection: true,
      state: { rowSelection: rowSelection.state },
      onRowSelectionChange: rowSelection.onChange,
      getRowId: rowSelection.getRowId,
    }),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border bg-card card-shadow">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b bg-muted/30 hover:bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors data-[state=selected]:bg-primary/5"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-40">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {emptyState ?? "Sin resultados"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-sm text-muted-foreground">
            Página <span className="font-medium text-foreground">{pagination.pageIndex + 1}</span> de{" "}
            <span className="font-medium text-foreground">{pagination.pageCount}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={pagination.pageIndex <= 0}
              onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={pagination.pageIndex >= pagination.pageCount - 1}
              onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
