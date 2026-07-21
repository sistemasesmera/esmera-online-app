import type { Metadata } from "next";
export const metadata: Metadata = { title: "Leads" };

import { LeadAISuggestions } from "@/components/features/crm/leads/lead-ai-suggestions";
import { DailyBriefing } from "@/components/features/crm/leads/daily-briefing";
import { LeadsClient } from "@/components/features/crm/leads/leads-client";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { listLeads } from "@/lib/data/leads.repository";
import { listUsers } from "@/lib/data/users.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function LeadsPage() {
  const user = await requireRole(CAPABILITIES.manageLeads);

  const today = new Date().toISOString().slice(0, 10);
  const showDailyBriefing = ["comercial", "jefe_comercial"].includes(user.role);
  const canUseAI = ["tech", "jefe_comercial"].includes(user.role);

  const supabase = await createClient();

  const [leads, users, briefingRow] = await Promise.all([
    listLeads(),
    listUsers(),
    showDailyBriefing
      ? supabase
          .from("daily_briefings")
          .select("content")
          .eq("user_id", user.id)
          .eq("briefing_date", today)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  const canEdit = roleHasCapability(user.role, "manageLeads");
  const canAssign = roleHasCapability(user.role, "assignLeads");

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Leads</h1>
      {showDailyBriefing && (
        <DailyBriefing
          initialContent={briefingRow?.content ?? null}
          userRole={user.role}
        />
      )}
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
