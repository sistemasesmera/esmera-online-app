"use client";

import { DateRangeFilter } from "./date-range-filter";
import type { LeadsPerOwnerRow } from "@/lib/data/reports.repository";
import { LEAD_STATUS_LABELS } from "@/lib/domain/leads/schema";
import type { LeadStatus } from "@/types/database.types";

const STATUSES: LeadStatus[] = ["nuevo", "en_contacto", "oferta_enviada", "convertido", "descartado"];

export function LeadsPerOwnerClient({
  rows,
  from,
  to,
}: {
  rows: LeadsPerOwnerRow[];
  from: string;
  to: string;
}) {
  const totals: Record<LeadStatus, number> = { nuevo: 0, en_contacto: 0, oferta_enviada: 0, convertido: 0, descartado: 0 };
  let grandTotal = 0;
  for (const row of rows) {
    grandTotal += row.total;
    for (const s of STATUSES) totals[s] += row.by_status[s] ?? 0;
  }

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay leads en este período.</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Vendedor</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                {STATUSES.map((s) => (
                  <th key={s} className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {LEAD_STATUS_LABELS[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.owner_id ?? "__unassigned__"} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.owner_name}</td>
                  <td className="px-4 py-3 text-right font-semibold">{row.total}</td>
                  {STATUSES.map((s) => (
                    <td key={s} className="px-4 py-3 text-right text-muted-foreground">
                      {row.by_status[s] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{grandTotal}</td>
                {STATUSES.map((s) => (
                  <td key={s} className="px-4 py-3 text-right">{totals[s]}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
