import {
  FileText,
  FilePlus,
  FileCheck2,
  FileX,
  User,
  UserCheck,
  UserCog,
  BookOpen,
  ArrowRightLeft,
  StickyNote,
  Phone,
  Folder,
  GraduationCap,
} from "lucide-react";
import type { ActivityLogRow } from "@/lib/data/activity-logs.repository";

const ACTION_ICON: Record<string, React.ElementType> = {
  "lead.created": User,
  "lead.updated": UserCog,
  "lead.status_changed": ArrowRightLeft,
  "lead.note_added": StickyNote,
  "lead.interaction_added": Phone,
  "lead.attachment_uploaded": FilePlus,
  "lead.attachment_deleted": FileX,
  "lead.converted": UserCheck,
  "student.created": User,
  "student.updated": UserCog,
  "student.expedient_closed": Folder,
  "student.attachment_uploaded": FilePlus,
  "student.attachment_deleted": FileX,
  "enrollment.created": BookOpen,
  "enrollment.status_changed": ArrowRightLeft,
  "enrollment.tutor_assigned": UserCog,
  "enrollment.attachment_uploaded": FilePlus,
  "enrollment.attachment_deleted": FileX,
  "enrollment.contract_signed": FileCheck2,
  "enrollment.contract_deleted": FileX,
  "enrollment.followup_added": GraduationCap,
};

const ACTION_COLOR: Record<string, string> = {
  "lead.created": "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400",
  "lead.updated": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "lead.status_changed": "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400",
  "lead.note_added": "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
  "lead.interaction_added": "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  "lead.attachment_uploaded": "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
  "lead.attachment_deleted": "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
  "lead.converted": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
  "student.created": "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400",
  "student.updated": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "student.expedient_closed": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "student.attachment_uploaded": "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
  "student.attachment_deleted": "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
  "enrollment.created": "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  "enrollment.status_changed": "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400",
  "enrollment.tutor_assigned": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "enrollment.attachment_uploaded": "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
  "enrollment.attachment_deleted": "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
  "enrollment.contract_signed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
  "enrollment.contract_deleted": "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
  "enrollment.followup_added": "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400",
};

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LogItem({ log }: { log: ActivityLogRow }) {
  const Icon = ACTION_ICON[log.action] ?? FileText;
  const color = ACTION_COLOR[log.action] ?? "bg-slate-100 text-slate-600";
  return (
    <div className="flex gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{log.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {log.user_name} · {formatDateTime(log.created_at)}
        </p>
      </div>
    </div>
  );
}

export function ActivityFeed({
  logs,
  priorLeadLogs,
  emptyText = "Sin actividad registrada.",
}: {
  logs: ActivityLogRow[];
  priorLeadLogs?: ActivityLogRow[];
  emptyText?: string;
}) {
  const hasMain = logs.length > 0;
  const hasPrior = priorLeadLogs && priorLeadLogs.length > 0;

  if (!hasMain && !hasPrior) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>
    );
  }

  return (
    <div>
      {hasMain && (
        <div className="space-y-0">
          {logs.map((log) => <LogItem key={log.id} log={log} />)}
        </div>
      )}

      {hasPrior && (
        <>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 border-t border-dashed border-border" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Actividad previa como lead
            </span>
            <div className="flex-1 border-t border-dashed border-border" />
          </div>
          <div className="space-y-0 opacity-75">
            {priorLeadLogs.map((log) => <LogItem key={log.id} log={log} />)}
          </div>
        </>
      )}
    </div>
  );
}
