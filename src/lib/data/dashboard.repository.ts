import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { EnrollmentStatus, LeadStatus } from "@/types/database.types";

// Enrollment statuses that generate real revenue
const MONEY_STATUSES = ["validada", "activa", "finalizada"];

function isMoneyEnrollment(row: { enrollments?: { status: string } | null }): boolean {
  return !!row.enrollments && MONEY_STATUSES.includes(row.enrollments.status);
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function calcEnrollmentDistribution(
  rows: Array<{ status: string }>,
  statuses: EnrollmentStatus[]
): Array<{ status: EnrollmentStatus; count: number }> {
  const counts = rows.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {}
  );
  return statuses.map((status) => ({ status, count: counts[status] ?? 0 }));
}

function calcLeadDistribution(
  rows: Array<{ status: string }>,
  statuses: LeadStatus[]
): Array<{ status: LeadStatus; count: number }> {
  const counts = rows.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {}
  );
  return statuses.map((status) => ({ status, count: counts[status] ?? 0 }));
}

type SaleRow = { amount: number; users: { id: string; full_name: string } | null };

function groupSalesByUser(rows: SaleRow[]): SalesByUser[] {
  const map: Record<string, { name: string; count: number; total: number }> = {};
  for (const row of rows) {
    const u = row.users;
    if (!u) continue;
    if (!map[u.id]) map[u.id] = { name: u.full_name, count: 0, total: 0 };
    map[u.id].count++;
    map[u.id].total += row.amount;
  }
  return Object.entries(map)
    .map(([userId, v]) => ({ userId, userName: v.name, count: v.count, total: v.total }))
    .sort((a, b) => b.total - a.total);
}

function buildMonthlySales(
  rows: Array<{ amount: number; signed_at: string | null }>,
  now: Date
): MonthlySale[] {
  const byMonth = rows.reduce<Record<string, { count: number; total: number }>>((acc, row) => {
    const m = row.signed_at!.slice(0, 7);
    if (!acc[m]) acc[m] = { count: 0, total: 0 };
    acc[m].count++;
    acc[m].total += row.amount;
    return acc;
  }, {});
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const raw = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    return { month: key, label: raw.charAt(0).toUpperCase() + raw.slice(1), count: byMonth[key]?.count ?? 0, total: byMonth[key]?.total ?? 0 };
  });
}

export type RecentLead = {
  id: string;
  full_name: string;
  status: LeadStatus;
  created_at: string;
};

export type RecentEnrollment = {
  id: string;
  status: EnrollmentStatus;
  enrollment_date: string;
  students: { full_name: string } | null;
  courses: { name: string } | null;
};

export type MonthlySale = {
  month: string;   // "2026-06"
  label: string;   // "Junio 2026"
  count: number;
  total: number;
};

export type SalesByUser = {
  userId: string;
  userName: string;
  count: number;
  total: number;
};

export type DashboardStats = {
  activeStudents: number;
  closedExpedients: number;
  totalStudents: number;
  activeEnrollments: number;
  enrollmentDistribution: Array<{ status: EnrollmentStatus; count: number }>;
  openLeads: number;
  leadDistribution: Array<{ status: LeadStatus; count: number }>;
  pendingCertificates: number;
  signedContractsThisMonth: number;
  monthlySales: MonthlySale[];
  salesByUser: SalesByUser[];
  recentLeads: RecentLead[];
  recentEnrollments: RecentEnrollment[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

  const [
    activeStudentsRes,
    atRiskStudentsRes,
    totalStudentsRes,
    activeEnrollmentsRes,
    enrollmentDistRes,
    openLeadsRes,
    leadDistRes,
    pendingCertsRes,
    signedContractsRes,
    monthlySalesRes,
    salesByUserRes,
    recentLeadsRes,
    recentEnrollmentsRes,
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "en_formacion"),
    supabase.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "expediente_cerrado"),
    supabase.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "activa"),
    supabase.from("enrollments").select("status").is("deleted_at", null),
    supabase.from("leads").select("*", { count: "exact", head: true }).in("status", ["nuevo", "contactado", "cualificado"]),
    supabase.from("leads").select("status"),
    supabase.from("certificates").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "pendiente"),
    supabase.from("contracts").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "firmado").gte("signed_at", startOfMonth),
    supabase.from("contracts").select("amount, signed_at, enrollments!enrollment_id(status)").eq("status", "firmado").is("deleted_at", null).not("signed_at", "is", null).gte("signed_at", twelveMonthsAgo),
    supabase.from("contracts").select("amount, users!created_by(id, full_name), enrollments!enrollment_id(status)").eq("status", "firmado").is("deleted_at", null).not("signed_at", "is", null).gte("signed_at", startOfMonth),
    supabase.from("leads").select("id, full_name, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("enrollments").select("id, status, enrollment_date, students!student_id(full_name), courses!course_id(name)").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
  ]);

  const enrollmentDistribution = calcEnrollmentDistribution(
    enrollmentDistRes.data ?? [],
    ["pendiente", "validada", "activa", "finalizada", "cancelada"]
  );
  const leadDistribution = calcLeadDistribution(
    leadDistRes.data ?? [],
    ["nuevo", "contactado", "cualificado", "convertido", "descartado"]
  );
  const validMonthlySalesRows = ((monthlySalesRes.data ?? []) as Array<{ amount: number; signed_at: string | null; enrollments?: { status: string } | null }>).filter(isMoneyEnrollment);
  const validSalesByUserRows = ((salesByUserRes.data ?? []) as Array<{ amount: number; users: { id: string; full_name: string } | null; enrollments?: { status: string } | null }>).filter(isMoneyEnrollment);
  const salesByUser = groupSalesByUser(validSalesByUserRows as unknown as SaleRow[]);
  const monthlySales = buildMonthlySales(validMonthlySalesRows as Array<{ amount: number; signed_at: string | null }>, now);

  return {
    activeStudents: activeStudentsRes.count ?? 0,
    closedExpedients: atRiskStudentsRes.count ?? 0,
    totalStudents: totalStudentsRes.count ?? 0,
    activeEnrollments: activeEnrollmentsRes.count ?? 0,
    enrollmentDistribution,
    openLeads: openLeadsRes.count ?? 0,
    leadDistribution,
    pendingCertificates: pendingCertsRes.count ?? 0,
    signedContractsThisMonth: signedContractsRes.count ?? 0,
    monthlySales,
    salesByUser,
    recentLeads: (recentLeadsRes.data ?? []) as RecentLead[],
    recentEnrollments: (recentEnrollmentsRes.data ?? []) as unknown as RecentEnrollment[],
  };
}

// ─── Jefe Comercial ──────────────────────────────────────────────────────────

export type JefeComercialStats = {
  openLeads: number;
  unassignedLeads: number;
  convertedLeads: number;
  totalLeads: number;
  activeStudents: number;
  activeEnrollments: number;
  salesThisMonthCount: number;
  salesThisMonthTotal: number;
  salesByUser: SalesByUser[];
  monthlySales: MonthlySale[];
  leadDistribution: Array<{ status: LeadStatus; count: number }>;
  enrollmentDistribution: Array<{ status: EnrollmentStatus; count: number }>;
  recentLeads: RecentLead[];
};

export async function getJefeComercialStats(): Promise<JefeComercialStats> {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

  const [
    openLeadsRes, unassignedLeadsRes, convertedLeadsRes, totalLeadsRes,
    activeStudentsRes, activeEnrollmentsRes,
    salesThisMonthRes, salesByUserRes, monthlySalesRes,
    leadDistRes, enrollmentDistRes, recentLeadsRes,
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).in("status", ["nuevo", "contactado", "cualificado"]),
    supabase.from("leads").select("*", { count: "exact", head: true }).is("owner_id", null),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "convertido"),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "en_formacion"),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "activa"),
    supabase.from("contracts").select("amount, enrollments!enrollment_id(status)").eq("status", "firmado").is("deleted_at", null).not("signed_at", "is", null).gte("signed_at", startOfMonth),
    supabase.from("contracts").select("amount, users!created_by(id, full_name), enrollments!enrollment_id(status)").eq("status", "firmado").is("deleted_at", null).not("signed_at", "is", null).gte("signed_at", startOfMonth),
    supabase.from("contracts").select("amount, signed_at, enrollments!enrollment_id(status)").eq("status", "firmado").is("deleted_at", null).not("signed_at", "is", null).gte("signed_at", twelveMonthsAgo),
    supabase.from("leads").select("status"),
    supabase.from("enrollments").select("status").is("deleted_at", null),
    supabase.from("leads").select("id, full_name, status, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const salesRows = ((salesThisMonthRes.data ?? []) as Array<{ amount: number; enrollments?: { status: string } | null }>).filter(isMoneyEnrollment);
  const validJefeSalesByUser = ((salesByUserRes.data ?? []) as Array<{ amount: number; users: { id: string; full_name: string } | null; enrollments?: { status: string } | null }>).filter(isMoneyEnrollment);
  const validJefeMonthlySales = ((monthlySalesRes.data ?? []) as Array<{ amount: number; signed_at: string | null; enrollments?: { status: string } | null }>).filter(isMoneyEnrollment);

  return {
    openLeads: openLeadsRes.count ?? 0,
    unassignedLeads: unassignedLeadsRes.count ?? 0,
    convertedLeads: convertedLeadsRes.count ?? 0,
    totalLeads: totalLeadsRes.count ?? 0,
    activeStudents: activeStudentsRes.count ?? 0,
    activeEnrollments: activeEnrollmentsRes.count ?? 0,
    salesThisMonthCount: salesRows.length,
    salesThisMonthTotal: salesRows.reduce((s, r) => s + r.amount, 0),
    salesByUser: groupSalesByUser(validJefeSalesByUser as unknown as SaleRow[]),
    monthlySales: buildMonthlySales(validJefeMonthlySales as Array<{ amount: number; signed_at: string | null }>, now),
    leadDistribution: calcLeadDistribution(leadDistRes.data ?? [], ["nuevo", "contactado", "cualificado", "convertido", "descartado"]),
    enrollmentDistribution: calcEnrollmentDistribution(enrollmentDistRes.data ?? [], ["pendiente", "validada", "activa", "finalizada", "cancelada"]),
    recentLeads: (recentLeadsRes.data ?? []) as RecentLead[],
  };
}

// ─── Comercial ───────────────────────────────────────────────────────────────

export type ComercialStats = {
  myOpenLeads: number;
  myStudents: number;
  myActiveEnrollments: number;
  mySalesThisMonthCount: number;
  mySalesThisMonthTotal: number;
  myLeadDistribution: Array<{ status: LeadStatus; count: number }>;
  myRecentLeads: RecentLead[];
  teamSalesByUser: SalesByUser[];
};

export async function getComercialDashboardStats(userId: string): Promise<ComercialStats> {
  const supabase = await createClient();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    myOpenLeadsRes, myStudentsRes, myActiveEnrollmentsRes,
    mySalesRes, myLeadDistRes, myRecentLeadsRes,
    teamSalesByUserRes,
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("owner_id", userId).in("status", ["nuevo", "contactado", "cualificado"]),
    supabase.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("assigned_to", userId).eq("status", "en_formacion"),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "activa"),
    supabase.from("contracts").select("amount, enrollments!enrollment_id(status)").eq("created_by", userId).eq("status", "firmado").is("deleted_at", null).not("signed_at", "is", null).gte("signed_at", startOfMonth),
    supabase.from("leads").select("status").eq("owner_id", userId),
    supabase.from("leads").select("id, full_name, status, created_at").eq("owner_id", userId).order("created_at", { ascending: false }).limit(8),
    supabase.from("contracts").select("amount, users!created_by(id, full_name), enrollments!enrollment_id(status)").eq("status", "firmado").is("deleted_at", null).not("signed_at", "is", null).gte("signed_at", startOfMonth),
  ]);

  const mySalesRows = ((mySalesRes.data ?? []) as Array<{ amount: number; enrollments?: { status: string } | null }>).filter(isMoneyEnrollment);
  const validTeamSalesByUser = ((teamSalesByUserRes.data ?? []) as Array<{ amount: number; users: { id: string; full_name: string } | null; enrollments?: { status: string } | null }>).filter(isMoneyEnrollment);

  return {
    myOpenLeads: myOpenLeadsRes.count ?? 0,
    myStudents: myStudentsRes.count ?? 0,
    myActiveEnrollments: myActiveEnrollmentsRes.count ?? 0,
    mySalesThisMonthCount: mySalesRows.length,
    mySalesThisMonthTotal: mySalesRows.reduce((s, r) => s + r.amount, 0),
    myLeadDistribution: calcLeadDistribution(myLeadDistRes.data ?? [], ["nuevo", "contactado", "cualificado", "convertido", "descartado"]),
    myRecentLeads: (myRecentLeadsRes.data ?? []) as RecentLead[],
    teamSalesByUser: groupSalesByUser(validTeamSalesByUser as unknown as SaleRow[]),
  };
}

// ─── Administración ──────────────────────────────────────────────────────────

export type PendingCertItem = {
  id: string;
  enrollments: { students: { full_name: string } | null; courses: { name: string } | null } | null;
};

export type AdminStats = {
  activeStudents: number;
  totalStudents: number;
  activeEnrollments: number;
  pendingEnrollments: number;
  signedContractsThisMonth: number;
  pendingCertificates: number;
  enrollmentDistribution: Array<{ status: EnrollmentStatus; count: number }>;
  recentEnrollments: RecentEnrollment[];
  pendingCertificatesList: PendingCertItem[];
};

export async function getAdminDashboardStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    activeStudentsRes, totalStudentsRes,
    activeEnrollmentsRes, pendingEnrollmentsRes,
    signedContractsRes, pendingCertsRes,
    enrollmentDistRes, recentEnrollmentsRes, pendingCertListRes,
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "en_formacion"),
    supabase.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "activa"),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "pendiente"),
    supabase.from("contracts").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "firmado").gte("signed_at", startOfMonth),
    supabase.from("certificates").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "pendiente"),
    supabase.from("enrollments").select("status").is("deleted_at", null),
    supabase.from("enrollments").select("id, status, enrollment_date, students!student_id(full_name), courses!course_id(name)").is("deleted_at", null).order("created_at", { ascending: false }).limit(6),
    supabase.from("certificates").select("id, enrollments!enrollment_id(students!student_id(full_name), courses!course_id(name))").is("deleted_at", null).eq("status", "pendiente").order("created_at", { ascending: true }).limit(6),
  ]);

  return {
    activeStudents: activeStudentsRes.count ?? 0,
    totalStudents: totalStudentsRes.count ?? 0,
    activeEnrollments: activeEnrollmentsRes.count ?? 0,
    pendingEnrollments: pendingEnrollmentsRes.count ?? 0,
    signedContractsThisMonth: signedContractsRes.count ?? 0,
    pendingCertificates: pendingCertsRes.count ?? 0,
    enrollmentDistribution: calcEnrollmentDistribution(enrollmentDistRes.data ?? [], ["pendiente", "validada", "activa", "finalizada", "cancelada"]),
    recentEnrollments: (recentEnrollmentsRes.data ?? []) as unknown as RecentEnrollment[],
    pendingCertificatesList: (pendingCertListRes.data ?? []) as unknown as PendingCertItem[],
  };
}

// ─── Tutor ───────────────────────────────────────────────────────────────────

export type TutorFollowupItem = {
  id: string;
  followup_date: string;
  contact_type: string;
  notes: string;
  enrollments: { students: { full_name: string } | null; courses: { name: string } | null } | null;
};

export type TutorEnrollmentItem = {
  id: string;
  students: { full_name: string } | null;
  courses: { name: string } | null;
};

export type TutorStats = {
  myActiveEnrollments: number;
  myFollowupsThisMonth: number;
  myTotalFollowups: number;
  myRecentFollowups: TutorFollowupItem[];
  myActiveEnrollmentsList: TutorEnrollmentItem[];
};

export async function getTutorDashboardStats(userId: string): Promise<TutorStats | null> {
  const supabase = await createClient();

  const { data: tutorRecord } = await supabase
    .from("tutors").select("id").eq("user_id", userId).single();

  if (!tutorRecord) return null;

  const tutorId = tutorRecord.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [
    activeEnrollmentsRes, followupsThisMonthRes, totalFollowupsRes,
    recentFollowupsRes, activeEnrollmentsListRes,
  ] = await Promise.all([
    supabase.from("enrollments").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "activa"),
    supabase.from("tutor_followups").select("*", { count: "exact", head: true }).eq("tutor_id", tutorId).gte("followup_date", startOfMonth),
    supabase.from("tutor_followups").select("*", { count: "exact", head: true }).eq("tutor_id", tutorId),
    supabase.from("tutor_followups").select("id, followup_date, contact_type, notes, enrollments!enrollment_id(students!student_id(full_name), courses!course_id(name))").eq("tutor_id", tutorId).order("followup_date", { ascending: false }).limit(5),
    supabase.from("enrollments").select("id, students!student_id(full_name), courses!course_id(name)").is("deleted_at", null).eq("status", "activa").order("created_at", { ascending: false }),
  ]);

  return {
    myActiveEnrollments: activeEnrollmentsRes.count ?? 0,
    myFollowupsThisMonth: followupsThisMonthRes.count ?? 0,
    myTotalFollowups: totalFollowupsRes.count ?? 0,
    myRecentFollowups: (recentFollowupsRes.data ?? []) as unknown as TutorFollowupItem[],
    myActiveEnrollmentsList: (activeEnrollmentsListRes.data ?? []) as unknown as TutorEnrollmentItem[],
  };
}
