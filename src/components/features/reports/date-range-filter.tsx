"use client";

import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const f = fd.get("from") as string;
    const t = fd.get("to") as string;
    router.push(`${pathname}?from=${f}&to=${t}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground whitespace-nowrap">Desde</label>
        <Input type="date" name="from" defaultValue={from} className="h-9 w-40 text-sm" required />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground whitespace-nowrap">Hasta</label>
        <Input type="date" name="to" defaultValue={to} className="h-9 w-40 text-sm" required />
      </div>
      <Button type="submit" size="sm" className="h-9">Aplicar</Button>
    </form>
  );
}
