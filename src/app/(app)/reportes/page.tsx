import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { getLeadsPerOwnerReport } from "@/lib/data/reports.repository";
import { LeadsPerOwnerClient } from "@/components/features/reports/leads-per-owner-client";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(CAPABILITIES.viewReports);

  const { from, to } = await searchParams;
  const resolvedFrom = from ?? "2026-09-01";
  const resolvedTo   = to   ?? "2026-09-30";

  const rows = await getLeadsPerOwnerReport(resolvedFrom, resolvedTo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground mt-1">Leads asignados por vendedor</p>
      </div>
      <LeadsPerOwnerClient rows={rows} from={resolvedFrom} to={resolvedTo} />
    </div>
  );
}
