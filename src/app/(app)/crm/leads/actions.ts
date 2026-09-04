"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { leadSchema, LEAD_SOURCES, type LeadInput } from "@/lib/domain/leads/schema";
import { convertLeadSchema, type ConvertLeadInput } from "@/lib/domain/students/schema";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { searchGhlOpportunitiesByPhone, updateGhlOpportunity } from "@/lib/ghl/api";
import { normalizePhone } from "@/lib/utils/phone";
import type { LeadSource } from "@/types/database.types";

export type ImportLeadRow = {
  full_name: string;
  email?: string;
  phone: string;
  source: string;
  interested_course?: string;
};

export type ImportLeadsResult = {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
};

type ActionResult = { error: string | null; success: boolean };

export async function createLead(input: LeadInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const { email, phone, interested_course, notes, dni_nie, address, province, postal_code, birth_date } = parsed.data;
  const supabase = await createClient();

  if (phone) {
    const cleanPhone = normalizePhone(phone);
    const { data: dupLead } = await supabase.from("leads").select("full_name").eq("phone", cleanPhone).maybeSingle();
    if (dupLead) return { error: `Ya existe un lead con ese teléfono (${dupLead.full_name})`, success: false };
    const { data: dupStudent } = await supabase.from("students").select("full_name").eq("phone", cleanPhone).is("deleted_at", null).maybeSingle();
    if (dupStudent) return { error: `Ese teléfono pertenece a un alumno ya registrado (${dupStudent.full_name})`, success: false };
  }

  const { data: created, error } = await supabase.from("leads").insert({
    full_name: parsed.data.full_name,
    source: parsed.data.source,
    status: "nuevo" as const,
    email: email || null,
    phone: phone ? normalizePhone(phone) : null,
    interested_course: interested_course || null,
    notes: null,
    owner_id: currentUser.id,
    dni_nie: dni_nie || null,
    address: address || null,
    province: province || null,
    postal_code: postal_code || null,
    birth_date: birth_date || null,
  }).select("id").single();

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "lead.created",
    entityType: "lead",
    entityId: created.id,
    entityName: parsed.data.full_name,
    description: `Lead creado (origen: ${parsed.data.source.replace(/_/g, " ")})`,
    leadId: created.id,
  });

  revalidatePath("/crm/leads");
  return { error: null, success: true };
}

export async function updateLead(id: string, input: LeadInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const { email, phone, interested_course, notes, owner_id, dni_nie, address, province, postal_code, birth_date } = parsed.data;
  const canAssign = roleHasCapability(currentUser.role, "assignLeads");
  const supabase = await createClient();

  if (phone) {
    const cleanPhone = normalizePhone(phone);
    const { data: dupLead } = await supabase.from("leads").select("full_name").eq("phone", cleanPhone).neq("id", id).maybeSingle();
    if (dupLead) return { error: `Ya existe un lead con ese teléfono (${dupLead.full_name})`, success: false };
    const { data: dupStudent } = await supabase.from("students").select("full_name").eq("phone", cleanPhone).is("deleted_at", null).maybeSingle();
    if (dupStudent) return { error: `Ese teléfono pertenece a un alumno ya registrado (${dupStudent.full_name})`, success: false };
  }

  const { error } = await supabase.from("leads").update({
    full_name: parsed.data.full_name,
    source: parsed.data.source,
    status: parsed.data.status,
    email: email || null,
    phone: phone ? normalizePhone(phone) : null,
    interested_course: interested_course || null,
    notes: notes || null,
    ...(canAssign ? { owner_id: owner_id || undefined } : {}),
    dni_nie: dni_nie || null,
    address: address || null,
    province: province || null,
    postal_code: postal_code || null,
    birth_date: birth_date || null,
  }).eq("id", id);

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "lead.updated",
    entityType: "lead",
    entityId: id,
    entityName: parsed.data.full_name,
    description: "Datos del lead actualizados",
    leadId: id,
  });

  revalidatePath("/crm/leads");
  return { error: null, success: true };
}

export async function assignLeads(
  leadIds: string[],
  newOwnerId: string | null
): Promise<ActionResult> {
  if (!leadIds.length) return { error: "No se seleccionaron leads", success: false };

  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.assignLeads);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();

  const { data: currentLeads } = await supabase
    .from("leads")
    .select("id, full_name, owner_id")
    .in("id", leadIds);

  if (!currentLeads?.length) return { error: "Leads no encontrados", success: false };

  let newOwnerName: string | null = null;
  if (newOwnerId) {
    const { data: ownerUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", newOwnerId)
      .single();
    newOwnerName = ownerUser?.full_name ?? null;
  }

  const prevOwnerIds = [...new Set(currentLeads.map((l) => l.owner_id).filter(Boolean))] as string[];
  const prevOwnerMap: Record<string, string> = {};
  if (prevOwnerIds.length) {
    const { data: prevOwners } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", prevOwnerIds);
    prevOwners?.forEach((u) => { prevOwnerMap[u.id] = u.full_name; });
  }

  const { error } = await supabase
    .from("leads")
    .update({ owner_id: newOwnerId })
    .in("id", leadIds);

  if (error) return { error: error.message, success: false };

  for (const lead of currentLeads) {
    const prevOwnerName = lead.owner_id ? (prevOwnerMap[lead.owner_id] ?? "Sin asignar") : "Sin asignar";
    const description = newOwnerName
      ? `Asignado por ${currentUser.fullName}: ${prevOwnerName} → ${newOwnerName}`
      : `Desasignado por ${currentUser.fullName} (era: ${prevOwnerName})`;

    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: "lead.assigned",
      entityType: "lead",
      entityId: lead.id,
      entityName: lead.full_name,
      description,
      leadId: lead.id,
      metadata: {
        previousOwnerId: lead.owner_id,
        previousOwnerName: prevOwnerName,
        newOwnerId,
        newOwnerName,
        assignedById: currentUser.id,
        assignedByName: currentUser.fullName,
      },
    });
  }

  revalidatePath("/crm/leads");
  return { error: null, success: true };
}

export async function updateLeadStatus(
  id: string,
  status: import("@/types/database.types").LeadStatus
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { error: "No autorizado", success: false };
  }
  if (status === "convertido") return { error: "Usa el flujo de conversión para marcar como convertido", success: false };

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("full_name, status").eq("id", id).single();
  if (!lead) return { error: "Lead no encontrado", success: false };

  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "lead.status_changed",
    entityType: "lead",
    entityId: id,
    entityName: lead.full_name,
    description: `Estado cambiado: ${lead.status} → ${status}`,
    leadId: id,
  });

  revalidatePath("/crm/leads");
  return { error: null, success: true };
}

export async function convertLeadToStudent(
  leadId: string,
  input: ConvertLeadInput
): Promise<{ error: string | null; success: boolean; studentId?: string; enrollmentId?: string }> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.convertLead);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = convertLeadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("status, owner_id")
    .eq("id", leadId)
    .single();

  if (!lead) return { error: "Lead no encontrado", success: false };
  if (lead.status === "convertido") return { error: "Este lead ya fue convertido a alumno", success: false };

  const { first_name, last_name, dni_nie, email, phone, address, province, postal_code, birth_date, course_id, enrollment_date, amount, notes, payment_type, cash_method, cash_amount, financer, financed_amount } = parsed.data;

  if (phone) {
    const cleanPhone = normalizePhone(phone);
    const { data: dupStudent } = await supabase.from("students").select("full_name").eq("phone", cleanPhone).is("deleted_at", null).maybeSingle();
    if (dupStudent) return { error: `Ya existe un alumno con ese teléfono (${dupStudent.full_name})`, success: false };
  }

  // 1. Create student
  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      status: "en_formacion",
      full_name: `${first_name} ${last_name}`,
      first_name,
      last_name,
      dni_nie,
      email,
      phone: phone ? normalizePhone(phone) : null,
      address: address || null,
      province: province || null,
      postal_code: postal_code || null,
      birth_date: birth_date || null,
      lead_id: leadId,
      assigned_to: lead.owner_id ?? null,
      created_by: currentUser.id,
    })
    .select("id")
    .single();

  if (studentError) {
    if (studentError.code === "23505") {
      if (studentError.message.includes("phone")) return { error: "Ya existe un alumno con ese teléfono", success: false };
      return { error: "Ya existe un alumno con ese DNI/NIE", success: false };
    }
    return { error: studentError.message, success: false };
  }

  // 2. Create enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .insert({
      student_id: student.id,
      course_id,
      enrollment_date,
      notes: notes || null,
      created_by: currentUser.id,
    })
    .select("id")
    .single();

  if (enrollError) {
    await supabase.from("students").delete().eq("id", student.id);
    return { error: enrollError.message, success: false };
  }

  // 3. Auto-create contract (borrador) linked to this enrollment
  await supabase.from("contracts").insert({
    enrollment_id: enrollment.id,
    student_id: student.id,
    amount,
    payment_type: payment_type ?? null,
    cash_method: cash_method ?? null,
    cash_amount: cash_amount ?? null,
    financer: financer ?? null,
    financed_amount: financed_amount ?? null,
    created_by: currentUser.id,
  });

  // 4. Transfer lead attachments to the new student
  // Use admin client to bypass RLS — at this point the rows have student_id=null
  // so user-scoped policies would silently match 0 rows.
  const adminClient = createAdminClient();
  await adminClient
    .from("student_attachments")
    .update({ student_id: student.id })
    .eq("lead_id", leadId);

  // 5. Mark lead as converted
  const { data: leadData } = await supabase.from("leads").select("full_name, phone").eq("id", leadId).single();
  await supabase.from("leads").update({
    status: "convertido",
    converted_to_student_id: student.id,
  }).eq("id", leadId);

  // 6. Marcar oportunidades de GHL como ganadas (best-effort, no bloquea si falla)
  if (leadData?.phone) {
    try {
      const cleanPhone = normalizePhone(leadData.phone);
      const opps = await searchGhlOpportunitiesByPhone(cleanPhone);
      const matching = opps.filter(
        (o) => o.contact.phone && normalizePhone(o.contact.phone) === cleanPhone && o.status === "open"
      );
      await Promise.all(matching.map((o) => updateGhlOpportunity(o.id, { status: "won" })));
    } catch {
      // silencioso — la conversión ya fue exitosa en Supabase
    }
  }

  const studentName = `${parsed.data.first_name} ${parsed.data.last_name}`;
  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "lead.converted",
    entityType: "lead",
    entityId: leadId,
    entityName: leadData?.full_name ?? undefined,
    description: `Lead convertido a alumno: ${studentName}`,
    leadId,
    studentId: student.id,
  });
  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "student.created",
    entityType: "student",
    entityId: student.id,
    entityName: studentName,
    description: `Alumno creado desde lead${leadData?.full_name ? `: ${leadData.full_name}` : ""}`,
    studentId: student.id,
  });

  revalidatePath("/crm/leads");
  revalidatePath("/students");
  revalidatePath("/enrollments");

  return { error: null, success: true, studentId: student.id, enrollmentId: enrollment.id };
}

export async function importLeads(rows: ImportLeadRow[]): Promise<ImportLeadsResult> {
  if (!rows.length) return { imported: 0, skipped: 0, errors: [] };
  if (rows.length > 1000) return { imported: 0, skipped: 0, errors: [{ row: 0, reason: "Máximo 1000 filas por importación" }] };

  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { imported: 0, skipped: 0, errors: [{ row: 0, reason: "No autorizado" }] };
  }

  const supabase = await createClient();

  // Prefetch all existing phones to avoid N+1 duplicate checks
  const [{ data: existingLeads }, { data: existingStudents }] = await Promise.all([
    supabase.from("leads").select("phone"),
    supabase.from("students").select("phone").is("deleted_at", null),
  ]);

  const existingPhones = new Set<string>([
    ...(existingLeads ?? []).map((l) => l.phone).filter((p): p is string => p !== null),
    ...(existingStudents ?? []).map((s) => s.phone).filter((p): p is string => p !== null),
  ]);

  let imported = 0;
  let skipped = 0;
  const errors: { row: number; reason: string }[] = [];
  const importedIds: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.full_name?.trim()) { errors.push({ row: rowNum, reason: "Nombre requerido" }); continue; }
    if (!row.phone?.trim()) { errors.push({ row: rowNum, reason: "Teléfono requerido" }); continue; }
    if (!LEAD_SOURCES.includes(row.source as LeadSource)) {
      errors.push({ row: rowNum, reason: `Origen inválido: "${row.source}"` });
      continue;
    }

    const cleanPhone = normalizePhone(row.phone.trim());
    if (existingPhones.has(cleanPhone)) { skipped++; continue; }

    const { data: created, error } = await supabase
      .from("leads")
      .insert({
        full_name: row.full_name.trim(),
        source: row.source as LeadSource,
        status: "nuevo" as const,
        email: row.email?.trim() || null,
        phone: cleanPhone,
        interested_course: row.interested_course?.trim() || null,
        owner_id: currentUser.id,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") { skipped++; }
      else { errors.push({ row: rowNum, reason: error.message }); }
      continue;
    }

    existingPhones.add(cleanPhone);
    importedIds.push(created.id);
    imported++;
  }

  if (imported > 0) {
    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: "lead.created",
      entityType: "lead",
      entityId: importedIds[0],
      entityName: `${imported} leads importados`,
      description: `Importación masiva: ${imported} lead${imported !== 1 ? "s" : ""} creados`,
    });
    revalidatePath("/crm/leads");
  }

  return { imported, skipped, errors };
}
