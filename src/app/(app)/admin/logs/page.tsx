import { requireRole } from "@/lib/auth/require-role";
import { getAllActivity } from "@/lib/data/activity-logs.repository";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { LogsClient } from "@/components/features/admin/logs-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LogsPage() {
  await requireRole(CAPABILITIES.manageUsers);
  const logs = await getAllActivity(500);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black tracking-tight mb-6">Logs de actividad</h1>
      <Card className="card-shadow border">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold">
            {logs.length} acciones registradas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <LogsClient logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
