"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { createFollowupSchema, updateFollowupSchema, type CreateFollowupInput, type UpdateFollowupInput } from "@/lib/domain/followups/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

export async function createFollowup(input: CreateFollowupInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.recordFollowup);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = createFollowupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("tutor_id, student_id")
    .eq("id", parsed.data.enrollment_id)
    .single();

  if (!enrollment) return { error: "Matrícula no encontrada", success: false };
  if (!enrollment.tutor_id) return { error: "Esta matrícula no tiene tutor asignado", success: false };

  if (currentUser.role === "tutor") {
    const { data: tutorRecord } = await supabase
      .from("tutors")
      .select("id")
      .eq("user_id", currentUser.id)
      .single();
    if (!tutorRecord || tutorRecord.id !== enrollment.tutor_id) {
      return { error: "Solo puedes añadir seguimientos a tus propias matrículas", success: false };
    }
  }

  const { error } = await supabase.from("tutor_followups").insert({
    enrollment_id: parsed.data.enrollment_id,
    tutor_id: enrollment.tutor_id,
    contact_type: parsed.data.contact_type,
    student_status_snapshot: "activo",
    notes: parsed.data.notes,
    followup_date: parsed.data.followup_date,
  });

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "enrollment.followup_added",
    entityType: "followup",
    entityId: parsed.data.enrollment_id,
    description: `Tutoría registrada`,
    studentId: enrollment.student_id,
    enrollmentId: parsed.data.enrollment_id,
  });

  revalidatePath("/tutoring");
  revalidatePath(`/students/${enrollment.student_id}`);
  revalidatePath(`/enrollments/${parsed.data.enrollment_id}`);
  return { error: null, success: true };
}

export async function updateFollowup(id: string, input: UpdateFollowupInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.recordFollowup);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = updateFollowupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tutor_followups")
    .select("enrollment_id, tutor_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Tutoría no encontrada", success: false };

  if (currentUser.role === "tutor") {
    const { data: tutorRecord } = await supabase
      .from("tutors")
      .select("id")
      .eq("user_id", currentUser.id)
      .single();
    if (!tutorRecord || tutorRecord.id !== existing.tutor_id) {
      return { error: "Solo puedes editar tus propias tutorías", success: false };
    }
  }

  const { error } = await supabase
    .from("tutor_followups")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/tutoring");
  revalidatePath(`/enrollments/${existing.enrollment_id}`);
  return { error: null, success: true };
}

export async function deleteFollowup(id: string): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.recordFollowup);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tutor_followups")
    .select("enrollment_id, tutor_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Tutoría no encontrada", success: false };

  if (currentUser.role === "tutor") {
    const { data: tutorRecord } = await supabase
      .from("tutors")
      .select("id")
      .eq("user_id", currentUser.id)
      .single();
    if (!tutorRecord || tutorRecord.id !== existing.tutor_id) {
      return { error: "Solo puedes eliminar tus propias tutorías", success: false };
    }
  }

  const { error } = await supabase
    .from("tutor_followups")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/tutoring");
  revalidatePath(`/enrollments/${existing.enrollment_id}`);
  return { error: null, success: true };
}
