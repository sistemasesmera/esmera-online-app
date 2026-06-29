import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Badge de estado genérico. Cada módulo de dominio define su propio mapa
 * `Record<Status, { label: string; className: string }>` (colores Tailwind)
 * y lo pasa aquí — este componente no conoce ningún dominio en particular.
 */
export function StatusBadge<Status extends string>({
  status,
  config,
}: {
  status: Status;
  config: Record<Status, { label: string; className: string }>;
}) {
  const entry = config[status];

  return (
    <Badge variant="outline" className={cn("font-medium", entry?.className)}>
      {entry?.label ?? status}
    </Badge>
  );
}
