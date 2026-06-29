"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/data/activity-logs.repository";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/data/attachments.shared";

type ActionResult = { error: string | null; success: boolean };

export async function saveLeadAttachmentMetadata(
  leadId: string,
  filePath: string,
  fileName: string,
  fileSize: number | null,
  mimeType: string | null,
  title?: string | null
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("student_attachments").insert({
    lead_id: leadId,
    student_id: null,
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
    action: "lead.attachment_uploaded",
    entityType: "attachment",
    entityId: leadId,
    description: `Adjunto subido: "${title ?? fileName}"`,
    metadata: { fileName, title },
    leadId,
  });

  revalidatePath(`/crm/leads/${leadId}`);
  return { error: null, success: true };
}

export async function deleteLeadAttachment(
  attachmentId: string,
  filePath: string,
  leadId: string
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageLeads);
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
    action: "lead.attachment_deleted",
    entityType: "attachment",
    entityId: leadId,
    description: `Adjunto eliminado: "${att?.title ?? att?.file_name ?? filePath}"`,
    leadId,
  });

  revalidatePath(`/crm/leads/${leadId}`);
  return { error: null, success: true };
}
