import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EnrollmentFichaClient } from "@/components/features/enrollments/enrollment-ficha-client";
import { requireRole } from "@/lib/auth/require-role";
import { getActivityByEnrollment } from "@/lib/data/activity-logs.repository";
import { getCertificatesByEnrollments } from "@/lib/data/certificates.repository";
import { getEnrollmentById } from "@/lib/data/enrollments.repository";
import { getFollowupsByEnrollments } from "@/lib/data/followups.repository";
import { listPlatforms } from "@/lib/data/platforms.repository";
import { listActiveTutors } from "@/lib/data/tutors.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";
import { BUCKET, type AttachmentWithUrl, type AttachmentWithUsers } from "@/lib/data/attachments.shared";

export default async function EnrollmentFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireRole(CAPABILITIES.viewEnrollments);

  const enrollment = await getEnrollmentById(id);
  if (!enrollment) notFound();

  const supabase = await createClient();
  const studentId = enrollment.students?.id ?? null;

  const [followups, certificates, platforms, tutors, activityLogs, enrollmentAttachmentsRaw, studentAttachmentsRaw] = await Promise.all([
    getFollowupsByEnrollments([id]),
    getCertificatesByEnrollments([id]),
    listPlatforms(),
    listActiveTutors(),
    getActivityByEnrollment(id),
    supabase
      .from("student_attachments")
      .select("*, users!uploaded_by(full_name)")
      .eq("enrollment_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => data ?? []),
    studentId
      ? supabase
          .from("student_attachments")
          .select("*, users!uploaded_by(full_name)")
          .eq("student_id", studentId)
          .is("enrollment_id", null)
          .is("certificate_id", null)
          .order("created_at", { ascending: false })
          .then(({ data }) => data ?? [])
      : Promise.resolve([]),
  ]);

  const signRows = async (rawRows: typeof enrollmentAttachmentsRaw): Promise<AttachmentWithUrl[]> => {
    const rows = rawRows as unknown as AttachmentWithUsers[];
    return Promise.all(
      rows.map(async (row) => {
        const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(row.file_path, 3600);
        return { ...row, signed_url: urlData?.signedUrl ?? null };
      })
    );
  };

  const [attachments, studentAttachments] = await Promise.all([
    signRows(enrollmentAttachmentsRaw),
    signRows(studentAttachmentsRaw),
  ]);

  const canEdit = roleHasCapability(user.role, "manageEnrollments");
  const canSign = roleHasCapability(user.role, "signContracts");
  const canFollowup = roleHasCapability(user.role, "manageFollowups");

  return (
    <div className="max-w-[1100px]">
      <Link
        href="/enrollments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 group"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Matrículas</span>
      </Link>

      <EnrollmentFichaClient
        enrollment={enrollment}
        followups={followups}
        certificate={certificates[0]}
        platforms={platforms}
        tutors={tutors}
        attachments={attachments}
        studentAttachments={studentAttachments}
        activityLogs={activityLogs}
        canEdit={canEdit}
        canSign={canSign}
        canFollowup={canFollowup}
        currentUserName={user.fullName}
      />
    </div>
  );
}
