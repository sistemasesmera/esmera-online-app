"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { createFollowupSchema, updateFollowupSchema, CONTACT_TYPE_LABELS, type CreateFollowupInput, type UpdateFollowupInput } from "@/lib/domain/followups/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

const SUPER_ADMIN_ROLES = ["tech", "administracion", "jefe_comercial"] as const;

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
    tutor_id: enrollment.tutor_id ?? null,
    contact_type: parsed.data.contact_type,
    student_status_snapshot: "activo",
    notes: parsed.data.notes,
    followup_date: parsed.data.followup_date,
    created_by: currentUser.id,
  });

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "enrollment.followup_added",
    entityType: "followup",
    entityId: parsed.data.enrollment_id,
    description: `Tutoría registrada (${CONTACT_TYPE_LABELS[parsed.data.contact_type]})`,
    metadata: { contact_type: parsed.data.contact_type, notes: parsed.data.notes },
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
    .select("enrollment_id, created_by, contact_type")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Tutoría no encontrada", success: false };

  if (!(SUPER_ADMIN_ROLES as readonly string[]).includes(currentUser.role)) {
    if (existing.created_by !== currentUser.id) {
      return { error: "Solo puedes editar tus propias tutorías", success: false };
    }
  }

  const { error } = await supabase
    .from("tutor_followups")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("id", existing.enrollment_id)
    .single();

  const contactType = (parsed.data.contact_type ?? existing.contact_type) as keyof typeof CONTACT_TYPE_LABELS;
  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "enrollment.followup_updated",
    entityType: "followup",
    entityId: existing.enrollment_id,
    description: `Tutoría editada (${CONTACT_TYPE_LABELS[contactType] ?? contactType})`,
    metadata: { followup_id: id, ...(parsed.data.notes ? { notes: parsed.data.notes } : {}) },
    studentId: enrollment?.student_id ?? null,
    enrollmentId: existing.enrollment_id,
  });

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
    .select("enrollment_id, created_by, contact_type, notes")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Tutoría no encontrada", success: false };

  if (!(SUPER_ADMIN_ROLES as readonly string[]).includes(currentUser.role)) {
    if (existing.created_by !== currentUser.id) {
      return { error: "Solo puedes eliminar tus propias tutorías", success: false };
    }
  }

  const { error } = await supabase
    .from("tutor_followups")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("id", existing.enrollment_id)
    .single();

  const contactType = existing.contact_type as keyof typeof CONTACT_TYPE_LABELS;
  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "enrollment.followup_deleted",
    entityType: "followup",
    entityId: existing.enrollment_id,
    description: `Tutoría eliminada (${CONTACT_TYPE_LABELS[contactType] ?? contactType})`,
    metadata: { followup_id: id, notes: existing.notes },
    studentId: enrollment?.student_id ?? null,
    enrollmentId: existing.enrollment_id,
  });

  revalidatePath("/tutoring");
  revalidatePath(`/enrollments/${existing.enrollment_id}`);
  return { error: null, success: true };
}
