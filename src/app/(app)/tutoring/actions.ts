"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { createFollowupSchema, type CreateFollowupInput } from "@/lib/domain/followups/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

export async function createFollowup(input: CreateFollowupInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageFollowups);
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
