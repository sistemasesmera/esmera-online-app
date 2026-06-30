import { notFound } from "next/navigation";

import { StudentDetailClient } from "@/components/features/students/student-detail-client";
import { requireRole } from "@/lib/auth/require-role";
import { getActivityByStudent, getLeadActivityForStudent } from "@/lib/data/activity-logs.repository";
import { getAttachmentsByStudent, getAttachmentsByEnrollments } from "@/lib/data/attachments.repository";
import { getCertificatesByEnrollments } from "@/lib/data/certificates.repository";
import { listCourses } from "@/lib/data/courses.repository";
import { getEnrollmentsByStudent } from "@/lib/data/enrollments.repository";
import { getFollowupsByEnrollments } from "@/lib/data/followups.repository";
import { getStudentById } from "@/lib/data/students.repository";
import { listUsers } from "@/lib/data/users.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(CAPABILITIES.viewStudents);

  const [student, enrollments, courses, users] = await Promise.all([
    getStudentById(id),
    getEnrollmentsByStudent(id),
    listCourses(),
    listUsers(),
  ]);

  if (!student) notFound();

  const enrollmentIds = enrollments.map((e) => e.id);
  const [followups, certificates, attachments, enrollmentAttachments, activityLogs, leadActivityLogs] = await Promise.all([
    getFollowupsByEnrollments(enrollmentIds),
    getCertificatesByEnrollments(enrollmentIds),
    getAttachmentsByStudent(id),
    getAttachmentsByEnrollments(enrollmentIds),
    getActivityByStudent(id),
    getLeadActivityForStudent(id),
  ]);

  const canEdit = roleHasCapability(user.role, "viewStudents");
  const canManageAttachments = roleHasCapability(user.role, "viewStudents");
  const canFollowup = roleHasCapability(user.role, "manageFollowups");
  const canAssignStudent = roleHasCapability(user.role, "manageStudents") || user.role === "jefe_comercial";

  return (
    <StudentDetailClient
      student={student}
      enrollments={enrollments}
      followups={followups}
      certificates={certificates}
      attachments={attachments}
      enrollmentAttachments={enrollmentAttachments}
      activityLogs={activityLogs}
      leadActivityLogs={leadActivityLogs}
      courses={courses}
      users={users}
      canEdit={canEdit}
      canManageAttachments={canManageAttachments}
      canFollowup={canFollowup}
      canAssignStudent={canAssignStudent}
      currentUserId={user.id}
      currentUserName={user.fullName}
    />
  );
}
