import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

const variantStyles = {
  default: {
    value: "text-foreground",
    icon: "bg-primary/10 text-primary",
    accent: "bg-primary",
  },
  warning: {
    value: "text-amber-600 dark:text-amber-400",
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    accent: "bg-amber-500",
  },
  success: {
    value: "text-emerald-600 dark:text-emerald-400",
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    accent: "bg-emerald-500",
  },
  danger: {
    value: "text-red-600 dark:text-red-400",
    icon: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    accent: "bg-red-500",
  },
} as const;

export function KpiCard({
  title,
  value,
  icon,
  description,
  variant = "default",
  valueDisplay,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  description?: string;
  variant?: keyof typeof variantStyles;
  valueDisplay?: string;
}) {
  const styles = variantStyles[variant];

  return (
    <Card className="relative overflow-hidden border bg-card card-shadow hover:card-shadow-md transition-shadow">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.accent}`} />
      <CardContent className="pl-7 pr-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
              {title}
            </p>
            <p className={`text-4xl font-black mt-2 tracking-tight leading-none ${styles.value}`}>
              {valueDisplay ?? value.toLocaleString("es-ES")}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-2 font-medium">{description}</p>
            )}
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
