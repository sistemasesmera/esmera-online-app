import { redirect } from "next/navigation";

import { PipelineStagesClient } from "@/components/features/admin/pipeline-stages-client";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listPipelineStages } from "@/lib/data/pipeline-stages.repository";

export default async function PipelineStagesPage() {
  const current = await getCurrentUser();
  if (!current || current.role !== "tech") redirect("/dashboard");

  const stages = await listPipelineStages();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Etapas del pipeline CRM</h1>
        <p className="text-muted-foreground">
          Configura las etapas del proceso comercial (leads → oportunidades).
        </p>
      </div>
      <PipelineStagesClient stages={stages} />
    </div>
  );
}
