import type { Metadata } from "next";
import {
  Award,
  Banknote,
  BookOpen,
  CalendarCheck,
  Clock,
  FileCheck,
  FolderCheck,
  GraduationCap,
  Monitor,
  Target,
  TrendingUp,
  UserMinus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { KpiCard } from "@/components/features/dashboard/kpi-card";
import { StatusDistribution } from "@/components/features/dashboard/status-distribution";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getDashboardStats,
  getJefeComercialStats,
  getComercialDashboardStats,
  getAdminDashboardStats,
  getTutorDashboardStats,
  type MonthlySale,
  type PaymentBreakdownRow,
  type SalesByUser,
  type RecentLead,
  type RecentEnrollment,
  type PendingCertItem,
  type TutorFollowupItem,
  type TutorEnrollmentItem,
} from "@/lib/data/dashboard.repository";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/domain/enrollments/schema";
import { CONTACT_TYPE_LABELS } from "@/lib/domain/followups/schema";
import { LEAD_STATUS_LABELS } from "@/lib/domain/leads/schema";
import { ROLE_LABELS } from "@/lib/domain/shared/permissions";

export const metadata: Metadata = { title: "Dashboard" };

// ─── Color maps ──────────────────────────────────────────────────────────────

const ENROLLMENT_COLORS: Record<string, string> = {
  pendiente: "#F59E0B", validada: "#3B82F6", activa: "#10B981",
  finalizada: "#6B7280", cancelada: "#EF4444",
};
const LEAD_COLORS: Record<string, string> = {
  nuevo: "#9CA3AF", en_contacto: "#3B82F6", oferta_enviada: "#8B5CF6",
  convertido: "#10B981", descartado: "#EF4444",
};
const LEAD_BADGE: Record<string, string> = {
  nuevo:          "bg-gray-100 text-gray-700",
  en_contacto:    "bg-blue-100 text-blue-700",
  oferta_enviada: "bg-purple-100 text-purple-700",
  convertido:     "bg-green-100 text-green-700",
  descartado:     "bg-red-100 text-red-700",
};
const ENROLLMENT_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  validada: "bg-blue-100 text-blue-700",
  activa: "bg-green-100 text-green-700",
  finalizada: "bg-gray-100 text-gray-700",
  cancelada: "bg-red-100 text-red-700",
};

function fmt(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function MonthlySalesTable({ monthlySales }: { monthlySales: MonthlySale[] }) {
  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-sm font-semibold">Por mes — últimos 12 meses</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mes</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contratos</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {monthlySales.map((row, i) => (
              <tr key={row.month} className={`border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors ${i === 0 ? "font-semibold" : ""}`}>
                <td className="px-4 py-2.5">{row.label}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {row.count > 0 ? row.count : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {row.total > 0 ? row.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30 font-semibold">
              <td className="px-4 py-2.5">Total</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{monthlySales.reduce((s, r) => s + r.count, 0)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {monthlySales.reduce((s, r) => s + r.total, 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}

function TeamRankingTable({ salesByUser, currentUserId, monthName }: { salesByUser: SalesByUser[]; currentUserId: string; monthName: string }) {
  const RANK_COLORS = ["text-amber-500 font-bold", "text-slate-400 font-bold", "text-orange-400 font-bold"];
  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-sm font-semibold">
          Ranking del equipo — <span className="font-normal text-muted-foreground">{monthName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {salesByUser.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">Sin ventas este mes.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-10">#</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comercial</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contratos</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {salesByUser.map((row, i) => {
                const isMe = row.userId === currentUserId;
                return (
                  <tr key={row.userId} className={`border-b border-border/50 last:border-0 transition-colors ${isMe ? "bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-muted/20"}`}>
                    <td className={`px-3 py-2.5 text-center tabular-nums ${RANK_COLORS[i] ?? "text-muted-foreground"}`}>
                      {i + 1}
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {row.userName}
                      {isMe && <span className="ml-2 text-xs text-indigo-500 font-normal">(tú)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                      {row.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function SalesByUserTable({ salesByUser, monthName }: { salesByUser: SalesByUser[]; monthName: string }) {
  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-sm font-semibold">
          Por vendedor — <span className="font-normal text-muted-foreground">{monthName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {salesByUser.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">Sin ventas este mes.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comercial</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contratos</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {salesByUser.map((row) => (
                <tr key={row.userId} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{row.userName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.count}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-semibold">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{salesByUser.reduce((s, r) => s + r.count, 0)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {salesByUser.reduce((s, r) => s + r.total, 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function RecentLeadsCard({ leads, title = "Últimos leads" }: { leads: RecentLead[]; title?: string }) {
  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin leads aún</p>
        ) : (
          <ul className="space-y-2.5">
            {leads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-2 py-0.5">
                <span className="text-sm font-medium truncate">{lead.full_name}</span>
                <Badge className={`shrink-0 text-xs border-0 ${LEAD_BADGE[lead.status] ?? ""}`}>
                  {LEAD_STATUS_LABELS[lead.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEnrollmentsCard({ enrollments, title = "Últimas matrículas" }: { enrollments: RecentEnrollment[]; title?: string }) {
  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin matrículas aún</p>
        ) : (
          <ul className="space-y-2.5">
            {enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-0.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.students?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.courses?.name ?? "—"}</p>
                </div>
                <Badge className={`shrink-0 text-xs border-0 ${ENROLLMENT_BADGE[e.status] ?? ""}`}>
                  {ENROLLMENT_STATUS_LABELS[e.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PendingCertificatesCard({ certs }: { certs: PendingCertItem[] }) {
  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          Certificados pendientes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {certs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin certificados pendientes</p>
        ) : (
          <ul className="space-y-2.5">
            {certs.map((cert) => (
              <li key={cert.id} className="flex items-center justify-between gap-2 py-0.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{cert.enrollments?.students?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{cert.enrollments?.courses?.name ?? "—"}</p>
                </div>
                <Badge className="shrink-0 text-xs border-0 bg-amber-100 text-amber-700">Pendiente</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentFollowupsCard({ followups }: { followups: TutorFollowupItem[] }) {
  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">Últimas tutorías registradas</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {followups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin tutorías registradas aún</p>
        ) : (
          <ul className="space-y-3">
            {followups.map((f) => (
              <li key={f.id} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.enrollments?.students?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.enrollments?.courses?.name ?? "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium">
                      {new Date(f.followup_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(CONTACT_TYPE_LABELS as Record<string, string>)[f.contact_type] ?? f.contact_type}
                    </p>
                  </div>
                </div>
                {f.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{f.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveEnrollmentsCard({ enrollments }: { enrollments: TutorEnrollmentItem[] }) {
  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">Mis alumnos en curso</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin matrículas activas</p>
        ) : (
          <ul className="space-y-2">
            {enrollments.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/enrollments/${e.id}`}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {e.students?.full_name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{e.courses?.name ?? "—"}</p>
                  </div>
                  <Badge className="shrink-0 text-xs border-0 bg-green-100 text-green-700">Activa</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  contado: "Contado",
  financiado: "Financiado",
  mixto: "Mixto",
  sin_tipo: "Sin tipo",
};

function PaymentBreakdownTable({ rows, monthName }: { rows: PaymentBreakdownRow[]; monthName: string }) {
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-sm font-semibold">
          Ventas por forma de pago — <span className="font-normal text-muted-foreground">{monthName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">Sin ventas este mes.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Forma de pago</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contratos</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.paymentType} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{PAYMENT_TYPE_LABELS[row.paymentType] ?? row.paymentType}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.count}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {grandTotal > 0 ? `${Math.round((row.total / grandTotal) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-semibold">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{rows.reduce((s, r) => s + r.count, 0)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{grandTotal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">100%</td>
              </tr>
            </tfoot>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Role dashboards ─────────────────────────────────────────────────────────

async function JefeComercialDashboard({ name, monthName }: { name: string; monthName: string }) {
  const stats = await getJefeComercialStats();
  const conversionRate = stats.totalLeads > 0 ? Math.round((stats.convertedLeads / stats.totalLeads) * 100) : 0;

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Hola, {name}</h1>
          <p className="text-muted-foreground mt-1">Jefe Comercial · {monthName}</p>
        </div>
        <Link
          href="/tv"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted transition-colors shrink-0"
        >
          <Monitor className="h-4 w-4" />
          Vista TV
        </Link>
      </div>

      <section>
        <SectionLabel>Rendimiento del equipo</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Leads activos" value={stats.openLeads} icon={<Target className="h-5 w-5" />} variant={stats.openLeads > 15 ? "warning" : "default"} />
          <KpiCard title="Sin asignar" value={stats.unassignedLeads} icon={<UserMinus className="h-5 w-5" />} variant={stats.unassignedLeads > 0 ? "danger" : "default"} description="leads sin comercial" />
          <KpiCard title="Tasa de conversión" value={conversionRate} icon={<TrendingUp className="h-5 w-5" />} variant="success" valueDisplay={`${conversionRate}%`} description={`${stats.convertedLeads} de ${stats.totalLeads} leads`} />
          <KpiCard title="Alumnos activos" value={stats.activeStudents} icon={<Users className="h-5 w-5" />} />
          <KpiCard title="Matrículas activas" value={stats.activeEnrollments} icon={<GraduationCap className="h-5 w-5" />} />
          <KpiCard title="Contratos este mes" value={stats.salesThisMonthCount} icon={<FileCheck className="h-5 w-5" />} variant="success" />
          <KpiCard title="Ventas este mes" value={stats.salesThisMonthTotal} icon={<Banknote className="h-5 w-5" />} variant="success" valueDisplay={fmt(stats.salesThisMonthTotal)} />
        </div>
      </section>

      <section>
        <SectionLabel>Pipeline y matrículas</SectionLabel>
        <div className="grid md:grid-cols-2 gap-4">
          <StatusDistribution title="Pipeline de leads" items={stats.leadDistribution.map(({ status, count }) => ({ label: LEAD_STATUS_LABELS[status], count, color: LEAD_COLORS[status] }))} />
          <StatusDistribution title="Matrículas por estado" items={stats.enrollmentDistribution.map(({ status, count }) => ({ label: ENROLLMENT_STATUS_LABELS[status], count, color: ENROLLMENT_COLORS[status] }))} />
        </div>
      </section>

      <section>
        <SectionLabel>Ventas del equipo</SectionLabel>
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <SalesByUserTable salesByUser={stats.salesByUser} monthName={monthName} />
          <MonthlySalesTable monthlySales={stats.monthlySales} />
        </div>
      </section>

      <section>
        <SectionLabel>Actividad reciente</SectionLabel>
        <RecentLeadsCard leads={stats.recentLeads} title="Últimos leads del equipo" />
      </section>
    </div>
  );
}

async function ComercialDashboard({ name, userId, monthName }: { name: string; userId: string; monthName: string }) {
  const stats = await getComercialDashboardStats(userId);

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Hola, {name}</h1>
        <p className="text-muted-foreground mt-1">Comercial · {monthName}</p>
      </div>

      <section>
        <SectionLabel>Mis métricas</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Mis leads activos" value={stats.myOpenLeads} icon={<Target className="h-5 w-5" />} variant={stats.myOpenLeads > 0 ? "warning" : "default"} />
          <KpiCard title="Mis alumnos" value={stats.myStudents} icon={<Users className="h-5 w-5" />} />
          <KpiCard title="Mis matrículas activas" value={stats.myActiveEnrollments} icon={<GraduationCap className="h-5 w-5" />} />
          <KpiCard
            title="Ventas este mes"
            value={stats.mySalesThisMonthTotal}
            icon={<Banknote className="h-5 w-5" />}
            variant="success"
            valueDisplay={fmt(stats.mySalesThisMonthTotal)}
            description={`${stats.mySalesThisMonthCount} ${stats.mySalesThisMonthCount === 1 ? "contrato" : "contratos"}`}
          />
        </div>
      </section>

      <section>
        <SectionLabel>Ranking del equipo este mes</SectionLabel>
        <div className="max-w-lg">
          <TeamRankingTable salesByUser={stats.teamSalesByUser} currentUserId={userId} monthName={monthName} />
        </div>
      </section>

      <section>
        <SectionLabel>Mi pipeline de leads</SectionLabel>
        <div className="max-w-lg">
          <StatusDistribution title="Mis leads por estado" items={stats.myLeadDistribution.map(({ status, count }) => ({ label: LEAD_STATUS_LABELS[status], count, color: LEAD_COLORS[status] }))} />
        </div>
      </section>

      <section>
        <SectionLabel>Actividad reciente</SectionLabel>
        <div className="max-w-lg">
          <RecentLeadsCard leads={stats.myRecentLeads} title="Mis últimos leads" />
        </div>
      </section>
    </div>
  );
}

async function AdminDashboard({ name, monthName }: { name: string; monthName: string }) {
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Hola, {name}</h1>
        <p className="text-muted-foreground mt-1">Administración · {monthName}</p>
      </div>

      <section>
        <SectionLabel>Operaciones</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard title="Alumnos activos" value={stats.activeStudents} icon={<Users className="h-5 w-5" />} description={`de ${stats.totalStudents} total`} />
          <KpiCard title="Matrículas activas" value={stats.activeEnrollments} icon={<GraduationCap className="h-5 w-5" />} />
          <KpiCard title="Pendiente validar" value={stats.pendingEnrollments} icon={<Clock className="h-5 w-5" />} variant={stats.pendingEnrollments > 0 ? "warning" : "default"} />
          <KpiCard title="Contratos firmados" value={stats.signedContractsThisMonth} icon={<FileCheck className="h-5 w-5" />} description="Este mes" variant="success" />
          <KpiCard title="Ingresos este mes" value={stats.revenueThisMonth} icon={<Banknote className="h-5 w-5" />} variant="success" valueDisplay={fmt(stats.revenueThisMonth)} description="matrículas válidas" />
          <KpiCard title="Certificados pendientes" value={stats.pendingCertificates} icon={<Award className="h-5 w-5" />} variant={stats.pendingCertificates > 0 ? "warning" : "default"} />
        </div>
      </section>

      <section>
        <SectionLabel>Finanzas del mes</SectionLabel>
        <div className="max-w-lg">
          <PaymentBreakdownTable rows={stats.salesByPaymentType} monthName={monthName} />
        </div>
      </section>

      <section>
        <SectionLabel>Distribución de matrículas</SectionLabel>
        <div className="max-w-lg">
          <StatusDistribution title="Matrículas por estado" items={stats.enrollmentDistribution.map(({ status, count }) => ({ label: ENROLLMENT_STATUS_LABELS[status], count, color: ENROLLMENT_COLORS[status] }))} />
        </div>
      </section>

      <section>
        <SectionLabel>Actividad reciente</SectionLabel>
        <div className="grid md:grid-cols-2 gap-4">
          <RecentEnrollmentsCard enrollments={stats.recentEnrollments} />
          <PendingCertificatesCard certs={stats.pendingCertificatesList} />
        </div>
      </section>
    </div>
  );
}

async function TutorDashboard({ name, userId, monthName }: { name: string; userId: string; monthName: string }) {
  const stats = await getTutorDashboardStats(userId);

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Hola, {name}</h1>
        <p className="text-muted-foreground mt-1">Tutor · {monthName}</p>
      </div>

      {!stats ? (
        <p className="text-muted-foreground">No se encontró perfil de tutor asociado a tu cuenta.</p>
      ) : (
        <>
          <section>
            <SectionLabel>Mis tutorías</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard title="Matrículas activas" value={stats.myActiveEnrollments} icon={<GraduationCap className="h-5 w-5" />} />
              <KpiCard title="Tutorías este mes" value={stats.myFollowupsThisMonth} icon={<CalendarCheck className="h-5 w-5" />} variant={stats.myFollowupsThisMonth > 0 ? "success" : "default"} />
              <KpiCard title="Total tutorías" value={stats.myTotalFollowups} icon={<BookOpen className="h-5 w-5" />} />
            </div>
          </section>

          <section>
            <SectionLabel>Registro reciente</SectionLabel>
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <RecentFollowupsCard followups={stats.myRecentFollowups} />
              <ActiveEnrollmentsCard enrollments={stats.myActiveEnrollmentsList} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

async function TechDashboard({ name, monthName }: { name: string; monthName: string }) {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Hola, {name}</h1>
          <p className="text-muted-foreground mt-1">Tech · {monthName}</p>
        </div>
        <Link
          href="/tv"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted transition-colors shrink-0"
        >
          <Monitor className="h-4 w-4" />
          Vista TV
        </Link>
      </div>

      <section>
        <SectionLabel>Indicadores clave</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard title="Alumnos activos" value={stats.activeStudents} icon={<Users className="h-5 w-5" />} description={`de ${stats.totalStudents} total`} />
          <KpiCard title="Expedientes cerrados" value={stats.closedExpedients} icon={<FolderCheck className="h-5 w-5" />} />
          <KpiCard title="Matrículas activas" value={stats.activeEnrollments} icon={<GraduationCap className="h-5 w-5" />} />
          <KpiCard title="Leads abiertos" value={stats.openLeads} icon={<Target className="h-5 w-5" />} />
          <KpiCard title="Certificados pendientes" value={stats.pendingCertificates} icon={<Award className="h-5 w-5" />} variant={stats.pendingCertificates > 0 ? "warning" : "default"} />
          <KpiCard title="Contratos firmados" value={stats.signedContractsThisMonth} icon={<FileCheck className="h-5 w-5" />} description="Este mes" variant="success" />
        </div>
      </section>

      <section>
        <SectionLabel>Distribución</SectionLabel>
        <div className="grid md:grid-cols-2 gap-4">
          <StatusDistribution title="Matrículas por estado" items={stats.enrollmentDistribution.map(({ status, count }) => ({ label: ENROLLMENT_STATUS_LABELS[status], count, color: ENROLLMENT_COLORS[status] }))} />
          <StatusDistribution title="Pipeline de leads" items={stats.leadDistribution.map(({ status, count }) => ({ label: LEAD_STATUS_LABELS[status], count, color: LEAD_COLORS[status] }))} />
        </div>
      </section>

      <section>
        <SectionLabel>Ventas</SectionLabel>
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <MonthlySalesTable monthlySales={stats.monthlySales} />
          <div className="flex flex-col gap-4">
            <SalesByUserTable salesByUser={stats.salesByUser} monthName={monthName} />
            <PaymentBreakdownTable rows={stats.salesByPaymentType} monthName={monthName} />
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Actividad reciente</SectionLabel>
        <div className="grid md:grid-cols-2 gap-4">
          <RecentLeadsCard leads={stats.recentLeads} />
          <RecentEnrollmentsCard enrollments={stats.recentEnrollments} />
        </div>
      </section>
    </div>
  );
}

// ─── Router ──────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rawMonth = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const monthName = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
  const firstName = user.fullName.split(" ")[0];

  if (user.role === "jefe_comercial") return <JefeComercialDashboard name={firstName} monthName={monthName} />;
  if (user.role === "comercial") return <ComercialDashboard name={firstName} userId={user.id} monthName={monthName} />;
  if (user.role === "administracion") return <AdminDashboard name={firstName} monthName={monthName} />;
  if (user.role === "tutor") return <TutorDashboard name={firstName} userId={user.id} monthName={monthName} />;
  return <TechDashboard name={firstName} monthName={monthName} />;
}
