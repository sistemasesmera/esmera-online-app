"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { createCourseSchema, updateCourseSchema, type CreateCourseInput, type UpdateCourseInput } from "@/lib/domain/courses/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CourseDocField = "dossier_url" | "temario_url";

// Called after the browser uploads the file directly to Supabase Storage.
// Only saves the resulting public URL to the DB — no file passes through the server.
export async function saveCourseDocUrl(
  courseId: string,
  field: CourseDocField,
  url: string
): Promise<{ error: string | null }> {
  try {
    await requireRole(CAPABILITIES.manageCourses);
  } catch {
    return { error: "No autorizado" };
  }

  try {
    const updatePayload = field === "dossier_url"
      ? { dossier_url: url }
      : { temario_url: url };

    const supabase = await createClient();
    const { error } = await supabase
      .from("courses")
      .update(updatePayload)
      .eq("id", courseId);

    if (error) return { error: error.message };

    revalidatePath("/courses");
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al guardar la URL";
    console.error("[saveCourseDocUrl]", err);
    return { error: msg };
  }
}

export async function deleteCourseDoc(
  courseId: string,
  field: CourseDocField
): Promise<{ error: string | null }> {
  try {
    await requireRole(CAPABILITIES.manageCourses);
  } catch {
    return { error: "No autorizado" };
  }

  try {
    const storage = createAdminClient();
    const fileName = field === "dossier_url" ? "dossier.pdf" : "temario.pdf";
    const path = `${courseId}/${fileName}`;

    await storage.storage.from("course-docs").remove([path]);

    const clearPayload = field === "dossier_url"
      ? { dossier_url: null }
      : { temario_url: null };

    const supabase = await createClient();
    const { error } = await supabase
      .from("courses")
      .update(clearPayload)
      .eq("id", courseId);

    if (error) return { error: error.message };

    revalidatePath("/courses");
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado al eliminar el archivo";
    console.error("[deleteCourseDoc]", err);
    return { error: msg };
  }
}

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
