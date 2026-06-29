"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import {
  createPipelineStageSchema,
  updatePipelineStageSchema,
  type CreatePipelineStageInput,
  type UpdatePipelineStageInput,
} from "@/lib/domain/catalogs/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

export async function createPipelineStage(input: CreatePipelineStageInput): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageCatalogs);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = createPipelineStageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pipeline_stages").insert(parsed.data);

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una etapa con ese código", success: false };
    return { error: error.message, success: false };
  }

  revalidatePath("/admin/pipeline-stages");
  return { error: null, success: true };
}

export async function updatePipelineStage(
  id: string,
  input: UpdatePipelineStageInput
): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageCatalogs);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = updatePipelineStageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pipeline_stages").update(parsed.data).eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/admin/pipeline-stages");
  return { error: null, success: true };
}
