"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { LEAD_STATUS_LABELS } from "@/lib/domain/leads/schema";
import { createClient } from "@/lib/supabase/server";
import type { LeadContactType, LeadStatus } from "@/types/database.types";

const leadInteractionSchema = z.object({
  contact_type: z.enum(["llamada_saliente", "llamada_entrante", "email", "whatsapp", "reunion", "otro"] as const),
  notes: z.string().min(1, "Las notas son obligatorias"),
  followup_date: z.string().min(1, "La fecha es obligatoria"),
  next_followup_date: z.string().optional(),
});

export type LeadInteractionInput = z.infer<typeof leadInteractionSchema>;

type ActionResult = { error: string | null; success: boolean };
type InteractionResult = ActionResult & {
  data?: {
    id: string;
    lead_id: string;
    user_id: string;
    contact_type: LeadContactType;
    notes: string;
    followup_date: string;
    next_followup_date: string | null;
    created_at: string;
    users: { full_name: string } | null;
  };
};

export async function addLeadInteraction(
  leadId: string,
  input: LeadInteractionInput
): Promise<InteractionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = leadInteractionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const { contact_type, notes, followup_date, next_followup_date } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lead_interactions")
    .insert({
      lead_id: leadId,
      user_id: currentUser.id,
      contact_type: contact_type as LeadContactType,
      notes,
      followup_date,
      next_followup_date: next_followup_date || null,
    })
    .select("*, users!user_id(full_name)")
    .single();

  if (error) return { error: error.message, success: false };

  const isNote = contact_type === "otro";
  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: isNote ? "lead.note_added" : "lead.interaction_added",
    entityType: "lead",
    entityId: leadId,
    description: isNote ? "Nota añadida" : `Contacto registrado: ${contact_type.replace(/_/g, " ")}`,
    metadata: { contact_type, notes: notes.slice(0, 200) },
    leadId,
  });

  revalidatePath(`/crm/leads/${leadId}`);
  return { error: null, success: true, data: data as InteractionResult["data"] };
}

export async function addQuickNote(
  leadId: string,
  text: string
): Promise<InteractionResult> {
  const today = new Date().toISOString().split("T")[0];
  return addLeadInteraction(leadId, {
    contact_type: "otro",
    notes: text,
    followup_date: today,
  });
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("status, full_name").eq("id", leadId).single();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "lead.status_changed",
    entityType: "lead",
    entityId: leadId,
    entityName: lead?.full_name ?? undefined,
    description: `Estado cambiado de "${LEAD_STATUS_LABELS[lead?.status as LeadStatus] ?? lead?.status}" a "${LEAD_STATUS_LABELS[status]}"`,
    metadata: { from: lead?.status, to: status },
    leadId,
  });

  revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/crm/leads");
  return { error: null, success: true };
}
