import { redirect } from "next/navigation";

import { PlatformsClient } from "@/components/features/admin/platforms-client";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listPlatforms } from "@/lib/data/platforms.repository";

export default async function PlatformsPage() {
  const current = await getCurrentUser();
  if (!current || current.role !== "tech") redirect("/dashboard");

  const platforms = await listPlatforms();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Plataformas</h1>
        <p className="text-muted-foreground">Gestiona las plataformas de formación disponibles.</p>
      </div>
      <PlatformsClient platforms={platforms} />
    </div>
  );
}
