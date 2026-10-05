import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/types/database.types";

export type LeadsPerOwnerRow = {
  owner_id: string | null;
  owner_name: string;
  total: number;
  by_status: Record<LeadStatus, number>;
};

export async function getLeadsPerOwnerReport(from: string, to: string): Promise<LeadsPerOwnerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, status, owner_id, users!owner_id(full_name)")
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59`);

  if (error) throw new Error(error.message);

  const map = new Map<string, LeadsPerOwnerRow>();
  for (const lead of data ?? []) {
    const key = lead.owner_id ?? "__unassigned__";
    const ownerName = (lead.users as { full_name: string } | null)?.full_name ?? "Sin asignar";
    if (!map.has(key)) {
      map.set(key, {
        owner_id: lead.owner_id,
        owner_name: ownerName,
        total: 0,
        by_status: { nuevo: 0, en_contacto: 0, oferta_enviada: 0, convertido: 0, descartado: 0 },
      });
    }
    const row = map.get(key)!;
    row.total++;
    row.by_status[lead.status as LeadStatus] = (row.by_status[lead.status as LeadStatus] ?? 0) + 1;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export type ContractReportRow = {
  id: string;
  comercial: string;
  student: string;
  course: string;
  amount: number;
  payment_type: string | null;
  signed_at: string;
  enrollment_status: string | null;
};

export async function getContractsReport(from: string, to: string): Promise<ContractReportRow[]> {
  const supabase = await createClient();

  // to: incluir hasta el final del día
  const toEndOfDay = `${to}T23:59:59`;

  const { data, error } = await supabase
    .from("contracts")
    .select(`
      id,
      amount,
      payment_type,
      signed_at,
      users!created_by(full_name),
      enrollments!enrollment_id(
        status,
        students!student_id(full_name),
        courses!course_id(name)
      )
    `)
    .eq("status", "firmado")
    .is("deleted_at", null)
    .not("signed_at", "is", null)
    .gte("signed_at", `${from}T00:00:00`)
    .lte("signed_at", toEndOfDay)
    .order("signed_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const u = row.users as { full_name: string } | null;
    const e = row.enrollments as {
      status: string;
      students: { full_name: string } | null;
      courses: { name: string } | null;
    } | null;
    return {
      id: row.id as string,
      comercial: u?.full_name ?? "—",
      student: e?.students?.full_name ?? "—",
      course: e?.courses?.name ?? "—",
      amount: row.amount as number,
      payment_type: row.payment_type as string | null,
      signed_at: row.signed_at as string,
      enrollment_status: e?.status ?? null,
    };
  });
}
