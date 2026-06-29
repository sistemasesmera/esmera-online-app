"use client";

import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck2,
  FileText,
  KanbanSquare,
  List,
  PlayCircle,
  Plus,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { activateEnrollment, assignTutor, updateEnrollmentStatus } from "@/app/(app)/enrollments/actions";
import { getGlobalEnrollmentColumns } from "@/components/features/enrollments/enrollment-columns";
import { EnrollmentForm } from "@/components/features/enrollments/enrollment-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseRow } from "@/lib/data/courses.repository";
import type { EnrollmentWithStudent } from "@/lib/data/enrollments.repository";
import type { PlatformRow } from "@/lib/data/platforms.repository";
import type { StudentRow } from "@/lib/data/students.repository";
import type { TutorWithUser } from "@/lib/data/tutors.repository";
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_TRANSITIONS,
  getTransitionLabel,
} from "@/lib/domain/enrollments/schema";
import type { ContractStatus, EnrollmentStatus } from "@/types/database.types";

const ALL_STATUSES = Object.entries(ENROLLMENT_STATUS_LABELS) as [EnrollmentStatus, string][];

const PIPELINE_STEPS: {
  status: EnrollmentStatus;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  headerColor: string;
}[] = [
  {
    status: "pendiente",
    Icon: Clock,
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    headerColor: "bg-yellow-50 border-yellow-200 text-yellow-700",
  },
  {
    status: "validada",
    Icon: CheckCircle2,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    headerColor: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    status: "activa",
    Icon: PlayCircle,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    headerColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    status: "finalizada",
    Icon: Trophy,
    color: "text-slate-600 bg-slate-50 border-slate-200",
    headerColor: "bg-slate-50 border-slate-200 text-slate-600",
  },
];

const CONTRACT_LABELS: Record<ContractStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  firmado: "Firmado",
  anulado: "Anulado",
};

const CONTRACT_COLORS: Record<ContractStatus, string> = {
  borrador: "bg-slate-100 text-slate-600",
  enviado: "bg-blue-100 text-blue-700",
  firmado: "bg-emerald-100 text-emerald-700",
  anulado: "bg-red-100 text-red-700",
};

type ViewMode = "table" | "kanban";

export function EnrollmentsClient({
  enrollments,
  courses,
  platforms,
  tutors,
  students,
  canEdit,
  canViewStudents = true,
}: {
  enrollments: EnrollmentWithStudent[];
  courses: CourseRow[];
  platforms: PlatformRow[];
  tutors: TutorWithUser[];
  students: StudentRow[];
  canEdit: boolean;
  canViewStudents?: boolean;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "table";
    return (localStorage.getItem("enrollments-view-mode") as ViewMode) ?? "table";
  });

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("enrollments-view-mode", mode);
  }
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | "">("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [activating, setActivating] = useState<EnrollmentWithStudent | null>(null);
  const [assigning, setAssigning] = useState<EnrollmentWithStudent | null>(null);
  const [platformId, setPlatformId] = useState("");
  const [tutorId, setTutorId] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setPageIndex(0); }, [search, statusFilter, pageSize]);

  const counts = Object.fromEntries(
    (["pendiente", "validada", "activa", "finalizada"] as EnrollmentStatus[]).map((s) => [
      s,
      enrollments.filter((e) => e.status === s).length,
    ])
  ) as Record<EnrollmentStatus, number>;

  const filtered = enrollments.filter((e) => {
    const matchSearch =
      !search ||
      e.students?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.courses?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  function handleTransition(enrollment: EnrollmentWithStudent, next: EnrollmentStatus) {
    if (next === "activa") {
      setActivating(enrollment);
      setPlatformId(enrollment.platform_id ?? "");
      setTutorId(enrollment.tutor_id ?? "");
      return;
    }
    startTransition(async () => {
      const result = await updateEnrollmentStatus(enrollment.id, next);
      if (result.error) toast.error(result.error);
      else toast.success(`Matrícula: ${ENROLLMENT_STATUS_LABELS[next]}`);
    });
  }

  function handleAssignTutor(enrollment: EnrollmentWithStudent) {
    setAssigning(enrollment);
    setPlatformId(enrollment.platform_id ?? "");
    setTutorId(enrollment.tutor_id ?? "");
  }

  function handleSaveAssignment() {
    if (!assigning) return;
    startTransition(async () => {
      const result = await assignTutor(assigning.id, tutorId || null, platformId || null);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Tutor y plataforma asignados");
        setAssigning(null);
      }
    });
  }

  function handleActivate() {
    if (!activating) return;
    startTransition(async () => {
      const result = await activateEnrollment(activating.id, platformId || null, tutorId || null);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Matrícula en curso");
        setActivating(null);
      }
    });
  }

  const columns = getGlobalEnrollmentColumns(canEdit, handleTransition, handleAssignTutor, canViewStudents);

  return (
    <>
      {/* Pipeline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {PIPELINE_STEPS.map(({ status, Icon, color }) => {
          const isActive = statusFilter === status;
          const [textColor, bgColor, borderColor] = color.split(" ");
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(isActive ? "" : status)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                isActive
                  ? `${bgColor} ${borderColor} ring-2 ring-offset-1 ring-current ${textColor}`
                  : "bg-card border-border"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? textColor : "text-muted-foreground"}`} />
              <div>
                <p className={`text-2xl font-black leading-none ${isActive ? textColor : ""}`}>
                  {counts[status] ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ENROLLMENT_STATUS_LABELS[status]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por alumno o curso…"
          filters={
            viewMode === "table" ? (
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EnrollmentStatus | "")}
              >
                <option value="">Todos los estados</option>
                {ALL_STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : undefined
          }
          actions={
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-md border border-input overflow-hidden">
                <button
                  onClick={() => changeViewMode("table")}
                  title="Vista tabla"
                  className={`flex items-center gap-1.5 px-3 h-9 text-sm transition-colors ${
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => changeViewMode("kanban")}
                  title="Vista Kanban"
                  className={`flex items-center gap-1.5 px-3 h-9 text-sm transition-colors ${
                    viewMode === "kanban"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <KanbanSquare className="h-4 w-4" />
                </button>
              </div>

              {canEdit && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Nueva matrícula
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Table view */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={pageData}
          pagination={{ pageIndex, pageCount, onPageChange: setPageIndex, pageSize, onPageSizeChange: setPageSize }}
        />
      )}

      {/* Kanban view */}
      {viewMode === "kanban" && (
        <KanbanBoard
          key={search}
          enrollments={enrollments.filter(
            (e) =>
              !search ||
              e.students?.full_name.toLowerCase().includes(search.toLowerCase()) ||
              e.courses?.name.toLowerCase().includes(search.toLowerCase())
          )}
          canEdit={canEdit}
          onTransition={handleTransition}
          onAssignTutor={handleAssignTutor}
        />
      )}

      {/* Assign tutor dialog */}
      <Dialog open={!!assigning} onOpenChange={(v) => !v && setAssigning(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar Tutor</DialogTitle>
            {assigning && (
              <p className="text-sm text-muted-foreground">
                {assigning.students?.full_name} — {assigning.courses?.name}
              </p>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Tutor asignado</Label>
              <Select value={tutorId} onValueChange={setTutorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tutor…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin tutor</SelectItem>
                  {tutors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.users?.full_name ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Plataforma</Label>
              <Select value={platformId} onValueChange={setPlatformId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin plataforma asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin plataforma</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAssignment} disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate dialog */}
      <Dialog open={!!activating} onOpenChange={(v) => !v && setActivating(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Activar matrícula</DialogTitle>
            {activating && (
              <p className="text-sm text-muted-foreground">
                {activating.students?.full_name} — {activating.courses?.name}
              </p>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Plataforma</Label>
              <Select value={platformId} onValueChange={setPlatformId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin plataforma asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin plataforma</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tutor asignado</Label>
              <Select value={tutorId} onValueChange={setTutorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin tutor asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin tutor</SelectItem>
                  {tutors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.users?.full_name ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivating(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleActivate} disabled={isPending}>
              {isPending ? "Activando…" : "Confirmar y activar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      {canEdit && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva matrícula</DialogTitle>
            </DialogHeader>
            <EnrollmentForm
              key="create"
              courses={courses}
              students={students}
              onSuccess={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   Kanban board
───────────────────────────────────────────── */

const KANBAN_COLUMNS: {
  status: EnrollmentStatus;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  headerCls: string;
  countCls: string;
  colCls: string;
}[] = [
  {
    status: "pendiente",
    label: "Pendiente de confirmar",
    Icon: Clock,
    headerCls: "bg-yellow-50 border-yellow-200",
    countCls: "bg-yellow-100 text-yellow-700",
    colCls: "bg-yellow-50/40",
  },
  {
    status: "validada",
    label: "Validada",
    Icon: CheckCircle2,
    headerCls: "bg-blue-50 border-blue-200",
    countCls: "bg-blue-100 text-blue-700",
    colCls: "bg-blue-50/40",
  },
  {
    status: "activa",
    label: "En curso",
    Icon: PlayCircle,
    headerCls: "bg-emerald-50 border-emerald-200",
    countCls: "bg-emerald-100 text-emerald-700",
    colCls: "bg-emerald-50/40",
  },
  {
    status: "finalizada",
    label: "Finalizada",
    Icon: Trophy,
    headerCls: "bg-slate-50 border-slate-200",
    countCls: "bg-slate-100 text-slate-600",
    colCls: "bg-slate-50/40",
  },
];

const KANBAN_STEP = 100;

function KanbanBoard({
  enrollments,
  canEdit,
  onTransition,
  onAssignTutor,
}: {
  enrollments: EnrollmentWithStudent[];
  canEdit: boolean;
  onTransition: (enrollment: EnrollmentWithStudent, next: EnrollmentStatus) => void;
  onAssignTutor: (enrollment: EnrollmentWithStudent) => void;
}) {
  const [shown, setShown] = useState<Record<string, number>>({});

  function getShown(key: string) { return shown[key] ?? KANBAN_STEP; }
  function showMore(key: string) {
    setShown((prev) => ({ ...prev, [key]: (prev[key] ?? KANBAN_STEP) + KANBAN_STEP }));
  }

  const byStatus = Object.fromEntries(
    KANBAN_COLUMNS.map((col) => [
      col.status,
      enrollments.filter((e) => e.status === col.status),
    ])
  ) as Record<EnrollmentStatus, EnrollmentWithStudent[]>;

  const canceladas = enrollments.filter((e) => e.status === "cancelada");
  const visibleCanceladas = canceladas.slice(0, getShown("cancelada"));
  const remainingCanceladas = canceladas.length - visibleCanceladas.length;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[900px]">
        {KANBAN_COLUMNS.map(({ status, label, Icon, headerCls, countCls, colCls }) => {
          const cards = byStatus[status] ?? [];
          const visible = cards.slice(0, getShown(status));
          const remaining = cards.length - visible.length;
          return (
            <div key={status} className="flex-1 min-w-[200px] flex flex-col gap-2">
              {/* Column header */}
              <div
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${headerCls}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 opacity-70" />
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${countCls}`}>
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className={`flex flex-col gap-2 rounded-xl p-2 min-h-[120px] ${colCls}`}>
                {cards.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6 opacity-60">
                    Sin matrículas
                  </p>
                )}
                {visible.map((enrollment) => (
                  <KanbanCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    canEdit={canEdit}
                    onTransition={onTransition}
                    onAssignTutor={onAssignTutor}
                  />
                ))}
                {remaining > 0 && (
                  <button
                    onClick={() => showMore(status)}
                    className="mt-1 w-full text-xs text-muted-foreground hover:text-foreground py-2 rounded-lg border border-dashed border-border hover:border-primary/30 transition-colors"
                  >
                    Ver {Math.min(KANBAN_STEP, remaining)} más ({remaining} restantes)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancelled row (collapsed, shown only if there are some) */}
      {canceladas.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Canceladas ({canceladas.length})
          </p>
          <div className="flex flex-col gap-2">
            {visibleCanceladas.map((enrollment) => (
              <KanbanCard
                key={enrollment.id}
                enrollment={enrollment}
                canEdit={false}
                onTransition={onTransition}
                onAssignTutor={onAssignTutor}
              />
            ))}
          </div>
          {remainingCanceladas > 0 && (
            <button
              onClick={() => showMore("cancelada")}
              className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground py-2 rounded-lg border border-dashed border-border hover:border-primary/30 transition-colors"
            >
              Ver {Math.min(KANBAN_STEP, remainingCanceladas)} más ({remainingCanceladas} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanCard({
  enrollment,
  canEdit,
  onTransition,
  onAssignTutor,
}: {
  enrollment: EnrollmentWithStudent;
  canEdit: boolean;
  onTransition: (enrollment: EnrollmentWithStudent, next: EnrollmentStatus) => void;
  onAssignTutor: (enrollment: EnrollmentWithStudent) => void;
}) {
  const contract = enrollment.contracts?.[0];
  const nextStatuses = ENROLLMENT_STATUS_TRANSITIONS[enrollment.status];
  const dateStr = new Date(enrollment.created_at).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm flex flex-col gap-2 text-sm">
      {/* Alumno */}
      <div>
        {enrollment.students ? (
          <Link
            href={`/students/${enrollment.students.id}`}
            className="font-semibold text-foreground hover:text-primary hover:underline leading-tight block"
          >
            {enrollment.students.full_name}
          </Link>
        ) : (
          <span className="font-semibold">—</span>
        )}
        <span className="text-xs text-muted-foreground mt-0.5 leading-tight block">
          {enrollment.courses?.name ?? "—"}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {dateStr && (
          <span className="text-xs text-muted-foreground tabular-nums">{dateStr}</span>
        )}
        {contract && (
          <Badge
            className={`text-[10px] px-1.5 py-0 h-4 font-medium ${CONTRACT_COLORS[contract.status]}`}
          >
            {contract.status === "firmado" ? (
              <FileCheck2 className="mr-0.5 h-2.5 w-2.5" />
            ) : (
              <FileText className="mr-0.5 h-2.5 w-2.5" />
            )}
            {CONTRACT_LABELS[contract.status]}
          </Badge>
        )}
      </div>

      {/* Plataforma / Tutor */}
      {(enrollment.platforms?.name || enrollment.tutors?.users?.full_name) && (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground border-t pt-1.5">
          {enrollment.platforms?.name && <span>{enrollment.platforms.name}</span>}
          {enrollment.tutors?.users?.full_name && (
            <span>{enrollment.tutors.users.full_name}</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1 border-t pt-1.5">
        <Link
          href={`/enrollments/${enrollment.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold rounded px-2 py-0.5 transition-colors ring-1 text-indigo-700 bg-indigo-50 ring-indigo-200 hover:bg-indigo-100"
        >
          <ClipboardList className="h-3 w-3" />
          Ficha
        </Link>
        {canEdit && enrollment.status === "validada" && (
          <button
            onClick={() => onAssignTutor(enrollment)}
            className="text-[11px] font-semibold rounded px-2 py-0.5 transition-colors cursor-pointer ring-1 text-violet-700 bg-violet-50 ring-violet-200 hover:bg-violet-100"
          >
            Asignar Tutor
          </button>
        )}
        {canEdit && nextStatuses.map((next) => (
          <button
            key={next}
            onClick={() => onTransition(enrollment, next as EnrollmentStatus)}
            className={`text-[11px] font-semibold rounded px-2 py-0.5 transition-colors cursor-pointer ring-1 ${
              next === "cancelada"
                ? "text-red-700 bg-red-50 ring-red-200 hover:bg-red-100"
                : "text-primary bg-primary/8 ring-primary/20 hover:bg-primary/15 hover:ring-primary/40"
            }`}
          >
            {getTransitionLabel(enrollment.status, next as EnrollmentStatus)}
          </button>
        ))}
      </div>
    </div>
  );
}
