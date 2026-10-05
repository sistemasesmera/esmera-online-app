"use client";

import { DateRangeFilter } from "./date-range-filter";
import type { LeadsPerOwnerRow } from "@/lib/data/reports.repository";

export function LeadsPerOwnerClient({
  rows,
  from,
  to,
}: {
  rows: LeadsPerOwnerRow[];
  from: string;
  to: string;
}) {
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay leads en este período.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Vendedor</th>
                <th className="px-4 py-3 text-right font-medium">Leads entrantes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.owner_id ?? "__unassigned__"} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.owner_name}</td>
                  <td className="px-4 py-3 text-right font-semibold">{row.total}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{grandTotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
