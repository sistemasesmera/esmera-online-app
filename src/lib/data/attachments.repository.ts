import "server-only";

import { createClient } from "@/lib/supabase/server";
import { BUCKET, type AttachmentWithUrl, type AttachmentWithUsers } from "@/lib/data/attachments.shared";

export { BUCKET, type AttachmentRow, type AttachmentWithUrl } from "@/lib/data/attachments.shared";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

async function signRows(supabase: Awaited<ReturnType<typeof createClient>>, rows: AttachmentWithUsers[]): Promise<AttachmentWithUrl[]> {
  return Promise.all(
    rows.map(async (attachment) => {
      const { data: urlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(attachment.file_path, SIGNED_URL_EXPIRY);
      return { ...attachment, signed_url: urlData?.signedUrl ?? null };
    })
  );
}

// Personal student attachments only (no enrollment, no certificate)
export async function getAttachmentsByStudent(studentId: string): Promise<AttachmentWithUrl[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_attachments")
    .select("*, users!uploaded_by(full_name)")
    .eq("student_id", studentId)
    .is("enrollment_id", null)
    .is("certificate_id", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  return signRows(supabase, data as unknown as AttachmentWithUsers[]);
}

// Enrollment attachments for a list of enrollment IDs
export async function getAttachmentsByEnrollments(enrollmentIds: string[]): Promise<AttachmentWithUrl[]> {
  if (!enrollmentIds.length) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_attachments")
    .select("*, users!uploaded_by(full_name)")
    .in("enrollment_id", enrollmentIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  return signRows(supabase, data as unknown as AttachmentWithUsers[]);
}
