"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";
import {
  createStudentSchema,
  updateStudentSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
} from "@/lib/domain/students/schema";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

export async function createStudent(input: CreateStudentInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageStudents);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = createStudentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const { first_name, last_name, phone, address, province, postal_code, birth_date, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("students").insert({
    ...rest,
    status: "en_formacion",
    first_name,
    last_name,
    full_name: `${first_name} ${last_name}`,
    phone: phone || null,
    address: address || null,
    province: province || null,
    postal_code: postal_code || null,
    birth_date: birth_date || null,
    created_by: currentUser.id,
  });

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("dni")) return { error: "Ya existe un alumno con ese DNI/NIE", success: false };
      return { error: "Error de duplicado en la base de datos: " + error.message, success: false };
    }
    return { error: error.message, success: false };
  }

  // Get the created student ID for logging
  const { data: created } = await supabase.from("students").select("id").eq("dni_nie", parsed.data.dni_nie).single();
  if (created) {
    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: "student.created",
      entityType: "student",
      entityId: created.id,
      entityName: `${parsed.data.first_name} ${parsed.data.last_name}`,
      description: "Alumno creado manualmente",
      studentId: created.id,
    });
  }

  revalidatePath("/students");
  return { error: null, success: true };
}

export async function updateStudent(id: string, input: UpdateStudentInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.viewStudents);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = updateStudentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const { first_name, last_name, phone, address, province, postal_code, birth_date, assigned_to, ...rest } = parsed.data;
  const canAssignStudent = roleHasCapability(currentUser.role, "manageStudents") || currentUser.role === "jefe_comercial";
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      ...rest,
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`,
      phone: phone || null,
      address: address || null,
      province: province || null,
      postal_code: postal_code || null,
      birth_date: birth_date || null,
      ...(canAssignStudent ? { assigned_to: (assigned_to === "" ? null : assigned_to) ?? null } : {}),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Ya existe un alumno con ese DNI/NIE", success: false };
    return { error: error.message, success: false };
  }

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "student.updated",
    entityType: "student",
    entityId: id,
    entityName: `${parsed.data.first_name} ${parsed.data.last_name}`,
    description: "Datos del alumno actualizados",
    studentId: id,
  });

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return { error: null, success: true };
}

export async function closeExpedient(id: string): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageStudents);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("full_name").eq("id", id).single();
  const { error } = await supabase
    .from("students")
    .update({ status: "expediente_cerrado" })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "student.expedient_closed",
    entityType: "student",
    entityId: id,
    entityName: student?.full_name ?? undefined,
    description: "Expediente cerrado",
    studentId: id,
  });

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return { error: null, success: true };
}
