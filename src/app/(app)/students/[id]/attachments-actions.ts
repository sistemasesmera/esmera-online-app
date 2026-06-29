"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/data/attachments.shared";

type ActionResult = { error: string | null; success: boolean };

export async function saveAttachmentMetadata(
  studentId: string,
  filePath: string,
  fileName: string,
  fileSize: number | null,
  mimeType: string | null,
  certificateId?: string | null,
  title?: string | null
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.viewStudents);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("student_attachments").insert({
    student_id: studentId,
    certificate_id: certificateId ?? null,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    mime_type: mimeType,
    uploaded_by: currentUser.id,
    title: title ?? null,
  });

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "student.attachment_uploaded",
    entityType: "attachment",
    entityId: studentId,
    description: `Adjunto subido: "${title ?? fileName}"`,
    metadata: { fileName, title },
    studentId,
  });

  revalidatePath(`/students/${studentId}`);
  return { error: null, success: true };
}

export async function deleteAttachment(
  attachmentId: string,
  filePath: string,
  studentId: string
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageStudents);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();

  const { data: att } = await supabase.from("student_attachments").select("title, file_name").eq("id", attachmentId).single();
  await supabase.storage.from(BUCKET).remove([filePath]);

  const { error } = await supabase
    .from("student_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) return { error: error.message, success: false };

  await logActivity({
    userId: currentUser.id,
    userName: currentUser.fullName,
    action: "student.attachment_deleted",
    entityType: "attachment",
    entityId: studentId,
    description: `Adjunto eliminado: "${att?.title ?? att?.file_name ?? filePath}"`,
    studentId,
  });

  revalidatePath(`/students/${studentId}`);
  return { error: null, success: true };
}
