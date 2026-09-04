import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OpportunityFichaClient } from "@/components/features/crm/opportunities/opportunity-ficha-client";
import { requireRole } from "@/lib/auth/require-role";
import { listCourses } from "@/lib/data/courses.repository";
import { getActivityByOpportunity } from "@/lib/data/activity-logs.repository";
import {
  fetchGhlOpportunityEnriched,
  fetchGhlContactNotes,
  fetchPipelineData,
} from "@/lib/data/ghl-opportunities.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function OpportunityFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(CAPABILITIES.manageOpportunities);

  const [opp, { pipelines }, activityLogs, courses] = await Promise.all([
    fetchGhlOpportunityEnriched(id),
    fetchPipelineData(),
    getActivityByOpportunity(id),
    listCourses(),
  ]);

  if (!opp) notFound();

  // Notas del contacto en GHL (best-effort)
  const notes = await fetchGhlContactNotes(opp.contact.id).catch(() => []);

  // Encontrar el pipeline y stages de esta oportunidad
  const pipeline = pipelines.find((p) => p.id === opp.pipelineId);
  const stages = pipeline?.stages ?? [];
  const currentStage = stages.find((s) => s.id === opp.pipelineStageId);

  const canEdit = roleHasCapability(user.role, "manageOpportunities");

  return (
    <div className="max-w-[1100px]">
      <Link
        href="/crm/opportunities"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 group"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Pipeline</span>
      </Link>
      <OpportunityFichaClient
        opp={opp}
        stages={stages}
        currentStage={currentStage ?? null}
        activityLogs={activityLogs}
        ghlNotes={notes}
        courses={courses}
        canEdit={canEdit}
      />
    </div>
  );
}
