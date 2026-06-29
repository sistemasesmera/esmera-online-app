"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { opportunitySchema, type OpportunityInput } from "@/lib/domain/opportunities/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

export async function createOpportunity(input: OpportunityInput): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageOpportunities);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = opportunitySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const { course_id, estimated_amount, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").insert({
    ...rest,
    course_id: course_id || null,
    estimated_amount: estimated_amount ?? null,
  });

  if (error) return { error: error.message, success: false };
  revalidatePath("/crm/opportunities");
  return { error: null, success: true };
}

export async function updateOpportunity(id: string, input: OpportunityInput): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageOpportunities);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = opportunitySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const { course_id, estimated_amount, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").update({
    ...rest,
    course_id: course_id || null,
    estimated_amount: estimated_amount ?? null,
  }).eq("id", id);

  if (error) return { error: error.message, success: false };
  revalidatePath("/crm/opportunities");
  return { error: null, success: true };
}
