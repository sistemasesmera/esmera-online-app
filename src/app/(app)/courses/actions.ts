"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { createCourseSchema, updateCourseSchema, type CreateCourseInput, type UpdateCourseInput } from "@/lib/domain/courses/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

export async function createCourse(input: CreateCourseInput): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageCourses);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const { code, duration_hours, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({
    ...rest,
    code: code || null,
    duration_hours: duration_hours ?? null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya existe un curso con ese código", success: false };
    return { error: error.message, success: false };
  }

  revalidatePath("/courses");
  return { error: null, success: true };
}

export async function updateCourse(id: string, input: UpdateCourseInput): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageCourses);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = updateCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const { code, duration_hours, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      ...rest,
      code: code || null,
      duration_hours: duration_hours ?? null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Ya existe un curso con ese código", success: false };
    return { error: error.message, success: false };
  }

  revalidatePath("/courses");
  return { error: null, success: true };
}
