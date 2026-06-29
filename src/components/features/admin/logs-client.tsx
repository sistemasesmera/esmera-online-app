"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { ActivityFeed } from "@/components/shared/activity-feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActivityLogRow } from "@/lib/data/activity-logs.repository";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const MODULE_OPTIONS = [
  { value: "",           label: "Todos los módulos" },
  { value: "lead",       label: "Leads" },
  { value: "student",    label: "Alumnos" },
  { value: "enrollment", label: "Matrículas" },
];

const ACTION_GROUP_OPTIONS = [
  { value: "",            label: "Todas las acciones" },
  { value: "created",     label: "Creaciones" },
  { value: "updated",     label: "Actualizaciones" },
  { value: "status",      label: "Cambios de estado" },
  { value: "attachment",  label: "Archivos adjuntos" },
  { value: "contract",    label: "Contratos" },
  { value: "converted",   label: "Conversiones" },
  { value: "followup",    label: "Seguimientos" },
];

function matchesActionGroup(action: string, group: string): boolean {
  if (!group) return true;
  if (group === "created")    return action.endsWith(".created");
  if (group === "updated")    return action.endsWith(".updated") || action.endsWith(".tutor_assigned");
  if (group === "status")     return action.endsWith(".status_changed");
  if (group === "attachment") return action.includes("attachment");
  if (group === "contract")   return action.includes("contract");
  if (group === "converted")  return action.endsWith(".converted") || action.endsWith(".expedient_closed");
  if (group === "followup")   return action.endsWith(".followup_added");
  return true;
}

export function LogsClient({ logs }: { logs: ActivityLogRow[] }) {
  const [search, setSearch]           = useState("");
  const [moduleFilter, setModule]     = useState("");
  const [actionGroup, setActionGroup] = useState("");
  const [userFilter, setUserFilter]   = useState("");
  const [pageIndex, setPageIndex]     = useState(0);
  const [pageSize, setPageSize]       = useState(50);

  useEffect(() => { setPageIndex(0); }, [search, moduleFilter, actionGroup, userFilter, pageSize]);

  const uniqueUsers = useMemo(() => {
    const names = Array.from(new Set(logs.map((l) => l.user_name).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare("es"));
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.description.toLowerCase().includes(q) &&
          !(l.user_name ?? "").toLowerCase().includes(q) &&
          !(l.entity_name ?? "").toLowerCase().includes(q)
        ) return false;
      }
      if (moduleFilter && l.entity_type !== moduleFilter) return false;
      if (!matchesActionGroup(l.action, actionGroup)) return false;
      if (userFilter && l.user_name !== userFilter) return false;
      return true;
    });
  }, [logs, search, moduleFilter, actionGroup, userFilter]);

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData  = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const hasFilters = search || moduleFilter || actionGroup || userFilter;

  function clearFilters() {
    setSearch("");
    setModule("");
    setActionGroup("");
    setUserFilter("");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción, usuario o entidad…"
            className="pl-8 h-9 text-sm"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModule(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {MODULE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={actionGroup}
          onChange={(e) => setActionGroup(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {ACTION_GROUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los usuarios</option>
          {uniqueUsers.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-muted-foreground -mt-1">
        {filtered.length === logs.length
          ? `${logs.length} registros en total`
          : `${filtered.length} de ${logs.length} registros`}
      </p>

      {/* Feed */}
      <ActivityFeed logs={pageData} emptyText="No hay actividad que coincida con los filtros." />

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2 px-1 pt-2 border-t">
        <div className="flex items-center gap-3">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} por página</option>
            ))}
          </select>
          {pageCount > 1 && (
            <span className="text-sm text-muted-foreground">
              Página <span className="font-medium text-foreground">{pageIndex + 1}</span> de{" "}
              <span className="font-medium text-foreground">{pageCount}</span>
            </span>
          )}
        </div>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={pageIndex <= 0}
              onClick={() => setPageIndex((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => setPageIndex((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
