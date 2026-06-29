import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TimelineEntry = {
  id: string;
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  timestamp: string;
};

export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col gap-6", className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-muted">
            {entry.icon ? <entry.icon className="h-3.5 w-3.5" /> : null}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{entry.title}</span>
              <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
            </div>
            {entry.description && <div className="text-sm text-muted-foreground">{entry.description}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
