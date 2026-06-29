import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatusDistribution({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; count: number; color: string }>;
}) {
  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3.5">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin datos</p>
        ) : (
          items.map(({ label, count, color }) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {count} &middot; {pct}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
