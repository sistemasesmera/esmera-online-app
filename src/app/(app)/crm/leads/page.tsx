import type { Metadata } from "next";
export const metadata: Metadata = { title: "Leads" };

import { LeadAISuggestions } from "@/components/features/crm/leads/lead-ai-suggestions";
import { LeadsClient } from "@/components/features/crm/leads/leads-client";
import { requireRole } from "@/lib/auth/require-role";
import { listLeads } from "@/lib/data/leads.repository";
import { listUsers } from "@/lib/data/users.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function LeadsPage() {
  const user = await requireRole(CAPABILITIES.manageLeads);

  const [leads, users] = await Promise.all([
    listLeads(),
    listUsers(),
  ]);
  const canEdit = roleHasCapability(user.role, "manageLeads");
  const canAssign = roleHasCapability(user.role, "assignLeads");
  const canUseAI = ["tech", "jefe_comercial"].includes(user.role);

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Leads</h1>
      {canUseAI && <LeadAISuggestions />}
      <LeadsClient
        leads={leads}
        users={users}
        currentUserId={user.id}
        canEdit={canEdit}
        canAssign={canAssign}
      />
    </div>
  );
}
