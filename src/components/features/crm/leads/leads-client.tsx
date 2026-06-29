"use client";

import {
  CheckCircle,
  Globe,
  KanbanSquare,
  Leaf,
  List,
  Megaphone,
  MessageCircle,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { usePersistedPageSize } from "@/hooks/use-persisted-page-size";
import type { RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";

import { assignLeads, updateLeadStatus } from "@/app/(app)/crm/leads/actions";
import { ConfirmStatusDialog } from "@/components/features/crm/leads/confirm-status-dialog";
import { getLeadColumns } from "@/components/features/crm/leads/lead-columns";
import { LeadForm } from "@/components/features/crm/leads/lead-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { LeadWithJoins } from "@/lib/data/leads.repository";
import type { UserRow } from "@/lib/data/users.repository";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TRANSITIONS,
  LEAD_TRANSITION_LABELS,
} from "@/lib/domain/leads/schema";
import type { LeadSource, LeadStatus } from "@/types/database.types";

const STORAGE_KEY = "esmera:leads-view";
const KANBAN_FIELDS_KEY = "esmera:leads-kanban-fields";
type ViewMode = "table" | "kanban";

export type KanbanField =
  | "email"
  | "phone"
  | "source"
  | "interested_course"
  | "owner"
  | "created_at"
  | "notes";

export const KANBAN_FIELD_LABELS: Record<KanbanField, string> = {
  email:             "Email",
  phone:             "Teléfono",
  source:            "Origen",
  interested_course: "Curso de interés",
  owner:             "Comercial asignado",
  created_at:        "Fecha de creación",
  notes:             "Notas",
};

const ALL_KANBAN_FIELDS: KanbanField[] = [
  "email", "phone", "source", "interested_course", "owner", "created_at", "notes",
];

const DEFAULT_KANBAN_FIELDS: KanbanField[] = [
  "source", "interested_course", "owner",
];

const ALL_STATUSES = Object.entries(LEAD_STATUS_LABELS) as [LeadStatus, string][];

const STATUS_CONFIG: Record<
  LeadStatus,
  { icon: React.ComponentType<{ className?: string }>; headerCls: string; countCls: string; colCls: string }
> = {
  nuevo:      { icon: Target,        headerCls: "bg-slate-50 border-slate-200",    countCls: "bg-slate-100 text-slate-600",    colCls: "bg-slate-50/40"    },
  contactado: { icon: MessageCircle, headerCls: "bg-blue-50 border-blue-200",      countCls: "bg-blue-100 text-blue-700",      colCls: "bg-blue-50/40"     },
  cualificado:{ icon: Sparkles,      headerCls: "bg-violet-50 border-violet-200",  countCls: "bg-violet-100 text-violet-700",  colCls: "bg-violet-50/40"   },
  convertido: { icon: CheckCircle,   headerCls: "bg-emerald-50 border-emerald-200",countCls: "bg-emerald-100 text-emerald-700",colCls: "bg-emerald-50/40"  },
  descartado: { icon: XCircle,       headerCls: "bg-red-50 border-red-200",        countCls: "bg-red-100 text-red-700",        colCls: "bg-red-50/40"      },
};

const ACTIVE_STATUSES: LeadStatus[] = ["nuevo", "contactado", "cualificado"];
const TERMINAL_STATUSES: LeadStatus[] = ["convertido", "descartado"];

const SOURCE_ICONS: Record<LeadSource, React.ReactNode> = {
  organico: <Leaf className="h-3 w-3 text-emerald-600" />,
  meta_ads: <Megaphone className="h-3 w-3 text-blue-600" />,
  web:      <Globe className="h-3 w-3 text-violet-600" />,
};
const SOURCE_CLS: Record<LeadSource, string> = {
  organico: "bg-emerald-50 text-emerald-700 border-emerald-200",
  meta_ads: "bg-blue-50 text-blue-700 border-blue-200",
  web:      "bg-violet-50 text-violet-700 border-violet-200",
};

/* ═══════════════════════════════════════════════════════════════
   Assign Modal
═══════════════════════════════════════════════════════════════ */
function AssignModal({
  open,
  onOpenChange,
  leadCount,
  users,
  onAssign,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadCount: number;
  users: UserRow[];
  onAssign: (userId: string) => void;
  isPending: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState("");

  // Comerciales + Jefe Comercial + Tech
  const comerciales = users.filter((u) =>
    ["comercial", "jefe_comercial", "tech"].includes(u.role as string)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Asignar {leadCount} lead{leadCount !== 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Selecciona el comercial al que quieres asignar {leadCount === 1 ? "este lead" : `estos ${leadCount} leads`}.
            La acción quedará registrada en el historial de actividad.
          </p>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">— Selecciona un comercial —</option>
            {comerciales.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedUserId || isPending}
              onClick={() => onAssign(selectedUserId)}
            >
              <UserCheck className="mr-1.5 h-4 w-4" />
              {isPending ? "Asignando…" : "Asignar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════ */
export function LeadsClient({
  leads,
  users,
  currentUserId,
  canEdit,
  canAssign,
}: {
  leads: LeadWithJoins[];
  users: UserRow[];
  currentUserId: string;
  canEdit: boolean;
  canAssign: boolean;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [kanbanFields, setKanbanFields] = useState<KanbanField[]>(DEFAULT_KANBAN_FIELDS);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "unassigned" | "">("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isPendingAssign, startAssignTransition] = useTransition();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("esmera:pageSize:leads");

  useEffect(() => { setPageIndex(0); }, [search, statusFilter, pageSize]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (saved === "table" || saved === "kanban") setViewMode(saved);
    const savedFields = localStorage.getItem(KANBAN_FIELDS_KEY);
    if (savedFields) {
      try {
        const parsed = JSON.parse(savedFields) as KanbanField[];
        if (Array.isArray(parsed)) setKanbanFields(parsed);
      } catch { /* ignore */ }
    }
  }, []);

  function toggleKanbanField(field: KanbanField) {
    setKanbanFields((prev) => {
      const next = prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field];
      localStorage.setItem(KANBAN_FIELDS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  const unassignedCount = leads.filter((l) => !l.owner_id).length;

  const counts = Object.fromEntries(
    (Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => [
      s,
      leads.filter((l) => l.status === s).length,
    ])
  ) as Record<LeadStatus, number>;

  const filtered = leads.filter((l) => {
    if (statusFilter === "unassigned") return !l.owner_id;
    if (!statusFilter && l.status === "convertido") return false;
    const matchSearch =
      !search ||
      l.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || l.status === (statusFilter as LeadStatus);
    return matchSearch && matchStatus;
  });

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  const columns = getLeadColumns(canAssign);

  function handleAssign(newOwnerId: string) {
    startAssignTransition(async () => {
      const result = await assignLeads(selectedIds, newOwnerId);
      if (result.error) {
        toast.error(result.error);
      } else {
        const ownerName = users.find((u) => u.id === newOwnerId)?.full_name ?? "comercial";
        toast.success(`${selectedIds.length} lead${selectedIds.length !== 1 ? "s" : ""} asignado${selectedIds.length !== 1 ? "s" : ""} a ${ownerName}`);
        setRowSelection({});
        setAssignOpen(false);
      }
    });
  }

  return (
    <>
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {([...ACTIVE_STATUSES, "descartado"] as LeadStatus[]).map((s) => {
          const { icon: Icon, headerCls, countCls } = STATUS_CONFIG[s];
          const [hCls1, hCls2] = headerCls.split(" ");
          const [, cCls2] = countCls.split(" ");
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(isActive ? "" : s)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                isActive ? `${hCls1} ${hCls2} ring-2 ring-offset-1 ring-current` : "bg-card border-border"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? cCls2 : "text-muted-foreground"}`} />
              <div>
                <p className={`text-2xl font-black leading-none ${isActive ? cCls2 : ""}`}>
                  {counts[s] ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{LEAD_STATUS_LABELS[s]}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sin asignar banner — solo visible para canAssign */}
      {canAssign && unassignedCount > 0 && (
        <button
          onClick={() => setStatusFilter(statusFilter === "unassigned" ? "" : "unassigned")}
          className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3 mb-4 text-left text-sm transition-all hover:shadow-sm ${
            statusFilter === "unassigned"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-300"
              : "bg-amber-50/60 border-amber-200 hover:bg-amber-50"
          }`}
        >
          <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="font-semibold text-amber-800">
            {unassignedCount} lead{unassignedCount !== 1 ? "s" : ""} sin asignar
          </span>
          <span className="text-amber-600 text-xs">
            — {statusFilter === "unassigned" ? "Viendo solo sin asignar" : "Clic para filtrar"}
          </span>
        </button>
      )}

      {/* Selection bar — visible when rows are selected */}
      {canAssign && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 mb-3">
          <span className="text-sm font-semibold text-primary">
            {selectedIds.length} lead{selectedIds.length !== 1 ? "s" : ""} seleccionado{selectedIds.length !== 1 ? "s" : ""}
          </span>
          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            disabled={isPendingAssign}
          >
            <UserCheck className="mr-1.5 h-4 w-4" />
            Asignar
          </Button>
          <button
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setRowSelection({})}
          >
            Deseleccionar todo
          </button>
        </div>
      )}

      {/* Toolbar */}
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre o email…"
        filters={
          viewMode === "table" ? (
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "unassigned" | "")}
            >
              <option value="">Todos los estados</option>
              {ALL_STATUSES.filter(([value]) => value !== "convertido").map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
              {canAssign && <option value="unassigned">Sin asignar</option>}
            </select>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-input overflow-hidden">
              <button
                onClick={() => changeView("table")}
                title="Vista tabla"
                className={`flex items-center px-3 h-9 text-sm transition-colors ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => changeView("kanban")}
                title="Vista Kanban"
                className={`flex items-center px-3 h-9 text-sm transition-colors ${
                  viewMode === "kanban"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <KanbanSquare className="h-4 w-4" />
              </button>
            </div>

            {viewMode === "kanban" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <SlidersHorizontal className="h-4 w-4" />
                    Tarjeta
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Mostrar en cada tarjeta
                  </p>
                  <div className="flex flex-col gap-2">
                    {ALL_KANBAN_FIELDS.map((field) => (
                      <label
                        key={field}
                        className="flex items-center gap-2.5 cursor-pointer select-none rounded-md px-1 py-0.5 hover:bg-muted transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={kanbanFields.includes(field)}
                          onChange={() => toggleKanbanField(field)}
                          className="h-4 w-4 rounded accent-primary"
                        />
                        <span className="text-sm">{KANBAN_FIELD_LABELS[field]}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {canEdit && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Nuevo lead
              </Button>
            )}
          </div>
        }
      />

      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={pageData}
          pagination={{ pageIndex, pageCount, onPageChange: setPageIndex, pageSize, onPageSizeChange: setPageSize }}
          rowSelection={
            canAssign
              ? {
                  state: rowSelection,
                  onChange: setRowSelection,
                  getRowId: (row) => row.id,
                }
              : undefined
          }
        />
      )}

      {viewMode === "kanban" && (
        <LeadsKanban
          key={search}
          leads={leads.filter(
            (l) =>
              !search ||
              l.full_name.toLowerCase().includes(search.toLowerCase()) ||
              (l.email ?? "").toLowerCase().includes(search.toLowerCase())
          )}
          canEdit={canEdit}
          visibleFields={kanbanFields}
        />
      )}

      {/* Create lead */}
      {canEdit && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuevo lead</DialogTitle></DialogHeader>
            <LeadForm
              key="create"
              users={users}
              currentUserId={currentUserId}
              onSuccess={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Assign modal */}
      {canAssign && (
        <AssignModal
          open={assignOpen}
          onOpenChange={setAssignOpen}
          leadCount={selectedIds.length}
          users={users}
          onAssign={handleAssign}
          isPending={isPendingAssign}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Kanban board
═══════════════════════════════════════════════════════════════ */
const KANBAN_STEP = 100;

function LeadsKanban({
  leads,
  canEdit,
  visibleFields,
}: {
  leads: LeadWithJoins[];
  canEdit: boolean;
  visibleFields: KanbanField[];
}) {
  const [shown, setShown] = useState<Record<string, number>>({});

  function getShown(status: string) { return shown[status] ?? KANBAN_STEP; }
  function showMore(status: string) {
    setShown((prev) => ({ ...prev, [status]: (prev[status] ?? KANBAN_STEP) + KANBAN_STEP }));
  }

  const byStatus = Object.fromEntries(
    (Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => [
      s,
      leads.filter((l) => l.status === s),
    ])
  ) as Record<LeadStatus, LeadWithJoins[]>;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[700px]">
        {ACTIVE_STATUSES.map((status) => {
          const { icon: Icon, headerCls, countCls, colCls } = STATUS_CONFIG[status];
          const cards = byStatus[status] ?? [];
          const visible = cards.slice(0, getShown(status));
          const remaining = cards.length - visible.length;
          return (
            <div key={status} className="flex-1 min-w-[220px] flex flex-col gap-2">
              <div className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${headerCls}`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 opacity-70" />
                  <span className="text-sm font-semibold">{LEAD_STATUS_LABELS[status]}</span>
                </div>
                <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${countCls}`}>
                  {cards.length}
                </span>
              </div>
              <div className={`flex flex-col gap-2 rounded-xl p-2 min-h-[120px] ${colCls}`}>
                {cards.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6 opacity-60">Sin leads</p>
                )}
                {visible.map((lead) => (
                  <LeadKanbanCard key={lead.id} lead={lead} canEdit={canEdit} visibleFields={visibleFields} />
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

      {TERMINAL_STATUSES.map((status) => {
        const cards = byStatus[status] ?? [];
        if (cards.length === 0) return null;
        const { icon: Icon, countCls } = STATUS_CONFIG[status];
        const visible = cards.slice(0, getShown(status));
        const remaining = cards.length - visible.length;
        return (
          <div key={status} className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${countCls.split(" ")[1]}`} />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {LEAD_STATUS_LABELS[status]} ({cards.length})
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {visible.map((lead) => (
                <LeadKanbanCard key={lead.id} lead={lead} canEdit={canEdit} visibleFields={visibleFields} />
              ))}
            </div>
            {remaining > 0 && (
              <button
                onClick={() => showMore(status)}
                className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground py-2 rounded-lg border border-dashed border-border hover:border-primary/30 transition-colors"
              >
                Ver {Math.min(KANBAN_STEP, remaining)} más ({remaining} restantes)
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Kanban card
═══════════════════════════════════════════════════════════════ */
function LeadKanbanCard({
  lead,
  canEdit,
  visibleFields,
}: {
  lead: LeadWithJoins;
  canEdit: boolean;
  visibleFields: KanbanField[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingTransition, setPendingTransition] = useState<LeadStatus | null>(null);
  const nextStatuses = LEAD_STATUS_TRANSITIONS[lead.status];

  const show = (f: KanbanField) => visibleFields.includes(f);

  function handleTransition(next: LeadStatus) {
    startTransition(async () => {
      const result = await updateLeadStatus(lead.id, next);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPendingTransition(null);
        toast.success(`Lead: ${LEAD_STATUS_LABELS[next]}`);
      }
    });
  }

  return (
    <>
      <div className={`rounded-lg border bg-card p-3 shadow-sm flex flex-col gap-2 text-sm transition-opacity ${isPending ? "opacity-50" : ""}`}>
        {/* Nombre + origen */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/crm/leads/${lead.id}`}
            className="font-semibold text-foreground hover:text-primary hover:underline leading-tight"
          >
            {lead.full_name}
          </Link>
          {show("source") && (
            <span className={`inline-flex items-center gap-1 shrink-0 text-[10px] font-semibold rounded-full border px-1.5 py-0.5 ${SOURCE_CLS[lead.source]}`}>
              {SOURCE_ICONS[lead.source]}
              {LEAD_SOURCE_LABELS[lead.source]}
            </span>
          )}
        </div>

        {/* Email */}
        {show("email") && lead.email && (
          <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
        )}

        {/* Teléfono */}
        {show("phone") && lead.phone && (
          <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
        )}

        {/* Curso de interés */}
        {show("interested_course") && lead.interested_course && (
          <p className="text-xs text-muted-foreground truncate">{lead.interested_course}</p>
        )}

        {/* Comercial asignado */}
        {show("owner") && (
          lead.owner_id ? (
            <p className="text-xs text-muted-foreground/70">{lead.users?.full_name}</p>
          ) : (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-fit">
              Sin asignar
            </p>
          )
        )}

        {/* Fecha de creación */}
        {show("created_at") && (
          <p className="text-xs text-muted-foreground/60">
            {new Date(lead.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        {/* Notas */}
        {show("notes") && lead.notes && (
          <p className="text-xs text-muted-foreground/70 line-clamp-2 italic">{lead.notes}</p>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-1 border-t pt-1.5">
          <Link
            href={`/crm/leads/${lead.id}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold rounded px-2 py-0.5 ring-1 text-indigo-700 bg-indigo-50 ring-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            Gestionar
          </Link>
          {canEdit && nextStatuses.map((next) => (
            <button
              key={next}
              disabled={isPending}
              onClick={() => setPendingTransition(next)}
              className={`text-[11px] font-semibold rounded px-2 py-0.5 ring-1 transition-colors cursor-pointer disabled:opacity-50 ${
                next === "descartado"
                  ? "text-red-700 bg-red-50 ring-red-200 hover:bg-red-100"
                  : next === "nuevo"
                  ? "text-slate-700 bg-slate-50 ring-slate-200 hover:bg-slate-100"
                  : "text-primary bg-primary/8 ring-primary/20 hover:bg-primary/15"
              }`}
            >
              {LEAD_TRANSITION_LABELS[next] ?? next}
            </button>
          ))}
        </div>
      </div>

      <ConfirmStatusDialog
        open={pendingTransition !== null}
        fromStatus={lead.status}
        toStatus={pendingTransition}
        leadName={lead.full_name}
        isPending={isPending}
        onConfirm={() => { if (pendingTransition) handleTransition(pendingTransition); }}
        onCancel={() => setPendingTransition(null)}
      />
    </>
  );
}
