import type { Database } from "@/types/database.types";

export const BUCKET = "adjuntos";

export type AttachmentRow = Database["public"]["Tables"]["student_attachments"]["Row"];
export type AttachmentWithUsers = AttachmentRow & { users: { full_name: string } | null };
export type AttachmentWithUrl = AttachmentWithUsers & { signed_url: string | null };
