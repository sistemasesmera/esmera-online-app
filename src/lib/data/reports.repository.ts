import "server-only";
import { createClient } from "@/lib/supabase/server";

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
