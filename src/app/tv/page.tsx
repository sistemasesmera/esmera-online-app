export const dynamic = "force-dynamic";

import { getTvStats } from "@/lib/data/dashboard.repository";
import { TvDashboardClient } from "@/components/features/tv/tv-client";

export default async function TvPage() {
  const stats = await getTvStats();
  return <TvDashboardClient stats={stats} />;
}
