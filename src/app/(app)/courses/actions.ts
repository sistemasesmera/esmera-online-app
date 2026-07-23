"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { createCourseSchema, updateCourseSchema, type CreateCourseInput, type UpdateCourseInput } from "@/lib/domain/courses/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CourseDocField = "dossier_url" | "temario_url";

export async function uploadCourseDoc(
  courseId: string,
  field: CourseDocField,
  formData: FormData
): Promise<{ error: string | null; url: string | null }> {
  try {
    await requireRole(CAPABILITIES.manageCourses);
  } catch {
    return { error: "No autorizado", url: null };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No se recibió archivo", url: null };
  const isPdf = file.type === "application/pdf" || file.type === "application/x-pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return { error: "Solo se permiten archivos PDF", url: null };
  if (file.size > 10 * 1024 * 1024) return { error: "El archivo no puede superar 10 MB", url: null };

  const storage = createAdminClient();
  const fileName = field === "dossier_url" ? "dossier.pdf" : "temario.pdf";
  const path = `${courseId}/${fileName}`;

  const { error: uploadError } = await storage.storage
    .from("course-docs")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });

  if (uploadError) return { error: uploadError.message, url: null };

  const { data: urlData } = storage.storage.from("course-docs").getPublicUrl(path);
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const updatePayload = field === "dossier_url"
    ? { dossier_url: publicUrl }
    : { temario_url: publicUrl };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("courses")
    .update(updatePayload)
    .eq("id", courseId);

  if (dbError) return { error: dbError.message, url: null };

  revalidatePath("/courses");
  return { error: null, url: publicUrl };
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
