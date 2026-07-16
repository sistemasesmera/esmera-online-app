"use client";

import Link from "next/link";
import { ArrowRight, Bot, Globe, Leaf, Megaphone, Phone, Share2, Users, Calendar, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { LeadWithJoins } from "@/lib/data/leads.repository";
import { LEAD_STATUS_LABELS } from "@/lib/domain/leads/schema";
import type { LeadSource, LeadStatus } from "@/types/database.types";

type SourceConfig = { label: string; icon: LucideIcon; className: string };

const SOURCE_CONFIG: Record<LeadSource, SourceConfig> = {
  organico: {
    label: "Orgánico",
    icon: Leaf,
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  meta_ads: {
    label: "Meta Ads",
    icon: Megaphone,
    className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  },
  web: {
    label: "Web",
    icon: Globe,
    className: "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800",
  },
  referido: {
    label: "Referido",
    icon: Users,
    className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  },
  redes_sociales: {
    label: "Redes Sociales",
    icon: Share2,
    className: "bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800",
  },
  llamada_entrante: {
    label: "Llamada",
    icon: Phone,
    className: "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800",
  },
  evento: {
    label: "Evento",
    icon: Calendar,
    className: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
  },
  agente_web: {
    label: "Agente Web",
    icon: Bot,
    className: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800",
  },
  otro: {
    label: "Otro",
    icon: MoreHorizontal,
    className: "bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

function LeadSourceBadge({ source }: { source: LeadSource }) {
  const { label, icon: Icon, className } = SOURCE_CONFIG[source];
  return (
    <Badge className={`inline-flex items-center gap-1 text-xs font-semibold ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

const STATUS_VARIANT: Record<LeadStatus, string> = {
  nuevo: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  contactado: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800",
  cualificado: "bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/60 dark:text-violet-300 dark:border-violet-800",
  convertido: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800",
  descartado: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/60 dark:text-red-300 dark:border-red-800",
};

export function getLeadColumns(withCheckbox = false): ColumnDef<LeadWithJoins>[] {
  const cols: ColumnDef<LeadWithJoins>[] = [];

  if (withCheckbox) {
    cols.push({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar lead"
        />
      ),
    });
  }

  cols.push(
    {
      accessorKey: "full_name",
      header: "Nombre",
      cell: ({ row }) => (
        <Link
          href={`/crm/leads/${row.original.id}`}
          className="font-semibold text-foreground hover:text-primary transition-colors"
        >
          {row.original.full_name}
        </Link>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.phone ?? "—"}</span>
      ),
    },
    {
      id: "source",
      header: "Origen",
      cell: ({ row }) => <LeadSourceBadge source={row.original.source} />,
    },
    {
      id: "course",
      header: "Curso",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.interested_course ?? "—"}</span>
      ),
    },
    {
      id: "owner",
      header: "Propietario",
      cell: ({ row }) => (
        row.original.owner_id ? (
          <span className="text-muted-foreground">{row.original.users?.full_name ?? "—"}</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            Sin asignar
          </span>
        )
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <Badge className={`text-xs font-semibold ${STATUS_VARIANT[row.original.status]}`}>
          {LEAD_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link
          href={`/crm/leads/${row.original.id}`}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 transition-colors cursor-pointer ring-1 ring-primary/20 hover:ring-primary/40"
        >
          Gestionar lead
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ),
    }
  );

  return cols;
}
