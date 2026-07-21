"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { sendNotification, sendNotificationsToRole } from "@/lib/data/notifications.repository";
import {
  createEnrollmentSchema,
  ENROLLMENT_STATUS_TRANSITIONS,
  ENROLLMENT_STATUS_LABELS,
  type CreateEnrollmentInput,
} from "@/lib/domain/enrollments/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";
import type { EnrollmentStatus } from "@/types/database.types";

type ActionResult = { error: string | null; success: boolean };

export async function createEnrollment(input: CreateEnrollmentInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.viewEnrollments);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = createEnrollmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const { duration_months, notes, amount, payment_type, cash_method, cash_amount, financer, financed_amount, ...rest } = parsed.data;
  const supabase = await createClient();

  let start_date: string | null = null;
  let end_date: string | null = null;
  if (duration_months) {
    start_date = parsed.data.enrollment_date;
    const d = new Date(parsed.data.enrollment_date);
    d.setMonth(d.getMonth() + duration_months);
    end_date = d.toISOString().slice(0, 10);
  }

  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .insert({
      ...rest,
      start_date,
      end_date,
      duration_months: duration_months ?? null,
      notes: notes || null,
      created_by: currentUser.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message, success: false };

  // Auto-create contract (borrador) for this enrollment
  await supabase.from("contracts").insert({
    enrollment_id: enrollment.id,
    student_id: parsed.data.student_id,
    amount: amount ?? 0,
    payment_type: payment_type ?? null,
    cash_method: cash_method ?? null,
    cash_amount: cash_amount ?? null,
    financer: financer ?? null,
    financed_amount: financed_amount ?? null,
    created_by: currentUser.id,
  });

  const { data: course } = await supabase.from("courses").select("name").eq("id", parsed.data.course_id).single();
  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "enrollment.created",
    entityType: "enrollment",
    entityId: enrollment.id,
    description: `Matrícula creada en "${course?.name ?? parsed.data.course_id}"`,
    studentId: parsed.data.student_id,
    enrollmentId: enrollment.id,
    metadata: { course: course?.name },
  });

  await sendNotificationsToRole("administracion", {
    type: "matricula_pendiente",
    title: "Nueva matrícula pendiente de validar",
    message: `Se ha creado una nueva matrícula en "${course?.name ?? "curso desconocido"}" que requiere validación.`,
    related_entity_type: "enrollment",
    related_entity_id: enrollment.id,
  });

  revalidatePath("/enrollments");
  revalidatePath(`/students/${parsed.data.student_id}`);
  return { error: null, success: true };
}

export async function updateEnrollmentStatus(
  id: string,
  newStatus: EnrollmentStatus
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageEnrollments);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("enrollments")
    .select("status, student_id")
    .eq("id", id)
    .single();

  if (!current) return { error: "Matrícula no encontrada", success: false };

  const validNext = ENROLLMENT_STATUS_TRANSITIONS[current.status as EnrollmentStatus];
  if (!validNext.includes(newStatus)) {
    return { error: `Transición no permitida: ${current.status} → ${newStatus}`, success: false };
  }

  const updateData =
    newStatus === "validada"
      ? { status: newStatus, validated_by: currentUser.id, validated_at: new Date().toISOString() }
      : { status: newStatus };

  const { error } = await supabase.from("enrollments").update(updateData).eq("id", id);
  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "enrollment.status_changed",
    entityType: "enrollment",
    entityId: id,
    description: `Estado de matrícula cambiado a "${ENROLLMENT_STATUS_LABELS[newStatus]}"`,
    studentId: current.student_id,
    enrollmentId: id,
    metadata: { from: current.status, to: newStatus },
  });

  if (newStatus === "validada") {
    await sendNotificationsToRole("jefe_comercial", {
      type: "matricula_pendiente",
      title: "Matrícula validada",
      message: "Una matrícula ha sido validada y está lista para asignar tutor y activar.",
      related_entity_type: "enrollment",
      related_entity_id: id,
    });
  }

  if (newStatus === "finalizada") {
    await sendNotificationsToRole("administracion", {
      type: "curso_finalizado",
      title: "Curso finalizado",
      message: "Una matrícula ha sido marcada como finalizada. Revisa si corresponde emitir certificado.",
      related_entity_type: "enrollment",
      related_entity_id: id,
    });
  }

  revalidatePath("/enrollments");
  revalidatePath(`/students/${current.student_id}`);
  return { error: null, success: true };
}

export async function assignTutor(
  id: string,
  tutorId: string | null,
  platformId: string | null
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageEnrollments);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("enrollments")
    .select("status, student_id")
    .eq("id", id)
    .single();

  if (!current) return { error: "Matrícula no encontrada", success: false };
  if (current.status !== "validada") {
    return { error: "Solo se puede asignar tutor cuando la matrícula está Validada", success: false };
  }

  const { error } = await supabase
    .from("enrollments")
    .update({ tutor_id: tutorId || null, platform_id: platformId || null })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "enrollment.tutor_assigned",
    entityType: "enrollment",
    entityId: id,
    description: "Tutor y plataforma asignados a la matrícula",
    studentId: current.student_id,
    enrollmentId: id,
    metadata: { tutor_id: tutorId, platform_id: platformId },
  });

  if (tutorId) {
    const supabase = await createClient();
    const { data: tutorRecord } = await supabase
      .from("tutors")
      .select("user_id")
      .eq("id", tutorId)
      .single();
    if (tutorRecord) {
      await sendNotification(tutorRecord.user_id, {
        type: "tutor_asignado",
        title: "Te han asignado a una matrícula",
        message: "Se te ha asignado como tutor de una nueva matrícula. Revisa tus alumnos activos.",
        related_entity_type: "enrollment",
        related_entity_id: id,
      });
    }
  }

  revalidatePath("/enrollments");
  revalidatePath(`/students/${current.student_id}`);
  return { error: null, success: true };
}

export async function activateEnrollment(
  id: string,
  platform_id: string | null,
  tutor_id: string | null
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageEnrollments);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("enrollments")
    .select("status, student_id")
    .eq("id", id)
    .single();

  if (!current) return { error: "Matrícula no encontrada", success: false };
  if (current.status !== "validada") {
    return { error: "La matrícula debe estar validada para activarse", success: false };
  }

  const { error } = await supabase
    .from("enrollments")
    .update({
      status: "activa",
      platform_id: platform_id || null,
      tutor_id: tutor_id || null,
      start_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "enrollment.status_changed",
    entityType: "enrollment",
    entityId: id,
    description: `Matrícula puesta en curso`,
    studentId: current.student_id,
    enrollmentId: id,
    metadata: { from: "validada", to: "activa", platform_id, tutor_id },
  });

  if (tutor_id) {
    const supabase = await createClient();
    const { data: tutorRecord } = await supabase
      .from("tutors")
      .select("user_id")
      .eq("id", tutor_id)
      .single();
    if (tutorRecord) {
      await sendNotification(tutorRecord.user_id, {
        type: "tutor_asignado",
        title: "Alumno puesto en curso",
        message: "Una de tus matrículas ha sido activada y el alumno está ahora en formación.",
        related_entity_type: "enrollment",
        related_entity_id: id,
      });
    }
  }

  revalidatePath("/enrollments");
  revalidatePath(`/students/${current.student_id}`);
  return { error: null, success: true };
}

export async function updateEnrollmentDates(
  id: string,
  data: { start_date: string | null; end_date: string | null; duration_months: number | null }
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageEnrollments);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("id", id)
    .single();

  if (!current) return { error: "Matrícula no encontrada", success: false };

  const { error } = await supabase
    .from("enrollments")
    .update({
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      duration_months: data.duration_months ?? null,
    })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "enrollment.dates_updated",
    entityType: "enrollment",
    entityId: id,
    description: "Fechas de la matrícula actualizadas",
    studentId: current.student_id,
    enrollmentId: id,
    metadata: data,
  });

  revalidatePath("/enrollments");
  revalidatePath(`/enrollments/${id}`);
  revalidatePath(`/students/${current.student_id}`);
  return { error: null, success: true };
}

export async function deleteSignedContract(
  enrollmentId: string,
  filePath: string | null
): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.signContracts);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();

  // Eliminar el fichero de Storage si existe
  if (filePath) {
    // filePath puede ser una signed URL completa; extraemos solo la ruta relativa si es necesario
    const pathMatch = filePath.match(/\/object\/sign\/adjuntos\/(.+?)\?/);
    const storagePath = pathMatch ? pathMatch[1] : null;
    if (storagePath) {
      await supabase.storage.from("adjuntos").remove([storagePath]);
    }
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .single();

  if (!contract) return { error: "Contrato no encontrado", success: false };

  const { error } = await supabase
    .from("contracts")
    .update({ status: "borrador", document_url: null, signed_at: null })
    .eq("id", contract.id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/enrollments");
  revalidatePath(`/enrollments/${enrollmentId}`);
  return { error: null, success: true };
}

export async function signContractForEnrollment(
  enrollmentId: string,
  documentUrl: string
): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.signContracts);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .single();

  if (!contract) return { error: "Contrato no encontrado", success: false };

  const { error } = await supabase
    .from("contracts")
    .update({ status: "firmado", document_url: documentUrl, signed_at: new Date().toISOString() })
    .eq("id", contract.id);

  if (error) return { error: error.message, success: false };

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("id", enrollmentId)
    .single();

  if (enrollment) revalidatePath(`/students/${enrollment.student_id}`);
  revalidatePath("/enrollments");
  revalidatePath(`/enrollments/${enrollmentId}`);

  await sendNotificationsToRole("jefe_comercial", {
    type: "nueva_venta",
    title: "Contrato firmado — nueva venta",
    message: "Se ha registrado la firma de un contrato.",
    related_entity_type: "enrollment",
    related_entity_id: enrollmentId,
  });

  return { error: null, success: true };
}
