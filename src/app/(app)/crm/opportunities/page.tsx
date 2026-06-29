import { OpportunitiesClient } from "@/components/features/crm/opportunities/opportunities-client";
import { requireRole } from "@/lib/auth/require-role";
import { listCourses } from "@/lib/data/courses.repository";
import { listLeads } from "@/lib/data/leads.repository";
import { listOpportunities } from "@/lib/data/opportunities.repository";
import { listPipelineStages } from "@/lib/data/pipeline-stages.repository";
import { listUsers } from "@/lib/data/users.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function OpportunitiesPage() {
  const user = await requireRole(CAPABILITIES.manageOpportunities);

  const [opportunities, leads, stages, courses, users] = await Promise.all([
    listOpportunities(),
    listLeads(),
    listPipelineStages(),
    listCourses(),
    listUsers(),
  ]);

  const canEdit = roleHasCapability(user.role, "manageOpportunities");

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Oportunidades</h1>
      <OpportunitiesClient
        opportunities={opportunities}
        leads={leads}
        stages={stages}
        courses={courses}
        users={users}
        currentUserId={user.id}
        canEdit={canEdit}
      />
    </div>
  );
}
