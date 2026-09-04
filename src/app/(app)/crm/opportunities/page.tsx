import { OpportunitiesClient } from "@/components/features/crm/opportunities/opportunities-client";
import { requireRole } from "@/lib/auth/require-role";
import { listCourses } from "@/lib/data/courses.repository";
import { fetchPipelineData } from "@/lib/data/ghl-opportunities.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function OpportunitiesPage() {
  const user = await requireRole(CAPABILITIES.manageOpportunities);
  const [{ pipelines, opportunitiesByPipeline }, courses] = await Promise.all([
    fetchPipelineData(),
    listCourses(),
  ]);

  const canEdit = roleHasCapability(user.role, "manageOpportunities");

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Oportunidades</h1>
      <OpportunitiesClient
        pipelines={pipelines}
        opportunitiesByPipeline={opportunitiesByPipeline}
        courses={courses}
        canEdit={canEdit}
      />
    </div>
  );
}
