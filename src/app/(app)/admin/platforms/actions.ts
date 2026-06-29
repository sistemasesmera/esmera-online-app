"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import {
  createPlatformSchema,
  updatePlatformSchema,
  type CreatePlatformInput,
  type UpdatePlatformInput,
} from "@/lib/domain/catalogs/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

export async function createPlatform(input: CreatePlatformInput): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageCatalogs);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = createPlatformSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("platforms").insert(parsed.data);

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una plataforma con ese código", success: false };
    return { error: error.message, success: false };
  }

  revalidatePath("/admin/platforms");
  return { error: null, success: true };
}

export async function updatePlatform(id: string, input: UpdatePlatformInput): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageCatalogs);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = updatePlatformSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("platforms").update(parsed.data).eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/admin/platforms");
  return { error: null, success: true };
}
