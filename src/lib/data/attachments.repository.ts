import "server-only";

import { createClient } from "@/lib/supabase/server";
import { BUCKET, type AttachmentWithUrl, type AttachmentWithUsers } from "@/lib/data/attachments.shared";

export { BUCKET, type AttachmentRow, type AttachmentWithUrl } from "@/lib/data/attachments.shared";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

export async function getAttachmentsByStudent(studentId: string): Promise<AttachmentWithUrl[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_attachments")
    .select("*, users!uploaded_by(full_name)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const rows = data as unknown as AttachmentWithUsers[];

  const withUrls = await Promise.all(
    rows.map(async (attachment) => {
      const { data: urlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(attachment.file_path, SIGNED_URL_EXPIRY);
      return { ...attachment, signed_url: urlData?.signedUrl ?? null };
    })
  );

  return withUrls;
}
