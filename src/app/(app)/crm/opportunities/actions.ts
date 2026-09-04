"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { updateGhlOpportunity } from "@/lib/ghl/api";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils/phone";
import type { LeadWithJoins } from "@/lib/data/leads.repository";

type ActionResult = { error: string | null; success: boolean };

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta", won: "Ganada", lost: "Perdida", abandoned: "Abandonada",
};

export async function moveOpportunityStage(
  opportunityId: string,
  stageId: string,
  meta?: { contactName?: string; fromStageName?: string; toStageName?: string }
): Promise<ActionResult> {
  let user;
  try { user = await requireRole(CAPABILITIES.manageOpportunities); }
  catch { return { error: "No autorizado", success: false }; }

  try {
    await updateGhlOpportunity(opportunityId, { pipelineStageId: stageId });

    await logActivity({
      userId: user.id,
      userName: user.fullName,
      action: "opportunity.stage_changed",
      entityType: "opportunity",
      entityId: opportunityId,
      entityName: meta?.contactName,
      description: meta?.fromStageName && meta?.toStageName
        ? `Etapa: ${meta.fromStageName} → ${meta.toStageName}`
        : "Etapa actualizada",
      metadata: { stageId, fromStageName: meta?.fromStageName, toStageName: meta?.toStageName },
    });

    revalidatePath("/crm/opportunities");
    revalidatePath(`/crm/opportunities/${opportunityId}`);
    return { error: null, success: true };
  } catch (e) {
    return { error: (e as Error).message, success: false };
  }
}

export async function updateOpportunityStatus(
  opportunityId: string,
  status: "open" | "won" | "lost" | "abandoned",
  meta?: { contactName?: string; fromStatus?: string }
): Promise<ActionResult> {
  let user;
  try { user = await requireRole(CAPABILITIES.manageOpportunities); }
  catch { return { error: "No autorizado", success: false }; }

  try {
    await updateGhlOpportunity(opportunityId, { status });

    await logActivity({
      userId: user.id,
      userName: user.fullName,
      action: "opportunity.status_changed",
      entityType: "opportunity",
      entityId: opportunityId,
      entityName: meta?.contactName,
      description: meta?.fromStatus
        ? `Estado: ${STATUS_LABELS[meta.fromStatus] ?? meta.fromStatus} → ${STATUS_LABELS[status]}`
        : `Estado cambiado a ${STATUS_LABELS[status]}`,
      metadata: { status, fromStatus: meta?.fromStatus },
    });

    revalidatePath("/crm/opportunities");
    revalidatePath(`/crm/opportunities/${opportunityId}`);
    return { error: null, success: true };
  } catch (e) {
    return { error: (e as Error).message, success: false };
  }
}

export async function updateOpportunityValue(
  opportunityId: string,
  monetaryValue: number,
  meta?: { contactName?: string }
): Promise<ActionResult> {
  let user;
  try { user = await requireRole(CAPABILITIES.manageOpportunities); }
  catch { return { error: "No autorizado", success: false }; }

  try {
    await updateGhlOpportunity(opportunityId, { monetaryValue });

    await logActivity({
      userId: user.id,
      userName: user.fullName,
      action: "opportunity.value_changed",
      entityType: "opportunity",
      entityId: opportunityId,
      entityName: meta?.contactName,
      description: `Valor actualizado a ${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(monetaryValue)}`,
      metadata: { monetaryValue },
    });

    revalidatePath("/crm/opportunities");
    revalidatePath(`/crm/opportunities/${opportunityId}`);
    return { error: null, success: true };
  } catch (e) {
    return { error: (e as Error).message, success: false };
  }
}

export async function findLeadForOpportunity(
  phone: string
): Promise<{ lead: LeadWithJoins | null; alreadyConverted: boolean }> {
  await requireRole(CAPABILITIES.manageOpportunities);
  const supabase = await createClient();
  const cleanPhone = normalizePhone(phone);

  const { data } = await supabase
    .from("leads")
    .select("*, users!owner_id(full_name)")
    .eq("phone", cleanPhone)
    .maybeSingle();

  if (!data) return { lead: null, alreadyConverted: false };
  const lead = { ...(data as unknown as LeadWithJoins), meta_submission_count: 0 };
  return { lead, alreadyConverted: data.status === "convertido" };
}
