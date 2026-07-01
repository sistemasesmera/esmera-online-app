import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters,
  actions,
}: {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        {onSearchChange && (
          <div className="relative min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-48 sm:w-64 pl-8"
            />
          </div>
        )}
        {filters}
      </div>
      {actions}
    </div>
  );
}
