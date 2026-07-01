import type { Metadata } from "next";
export const metadata: Metadata = { title: "Matrículas" };

import { EnrollmentsClient } from "@/components/features/enrollments/enrollments-client";
import { requireRole } from "@/lib/auth/require-role";
import { listCourses } from "@/lib/data/courses.repository";
import { listEnrollments } from "@/lib/data/enrollments.repository";
import { listPlatforms } from "@/lib/data/platforms.repository";
import { listStudents } from "@/lib/data/students.repository";
import { getTutorByUserId, listActiveTutors } from "@/lib/data/tutors.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function EnrollmentsPage() {
  const user = await requireRole(CAPABILITIES.viewEnrollments);

  const canViewAll = roleHasCapability(user.role, "viewAllEnrollments");

  let enrollmentFilter: Parameters<typeof listEnrollments>[0];
  if (!canViewAll) {
    if (user.role === "tutor") {
      const tutor = await getTutorByUserId(user.id);
      enrollmentFilter = tutor ? { tutorId: tutor.id } : { tutorId: "" };
    } else {
      enrollmentFilter = { createdBy: user.id };
    }
  }

  const [enrollments, courses, platforms, tutors, students] = await Promise.all([
    listEnrollments(enrollmentFilter),
    listCourses(),
    listPlatforms(),
    listActiveTutors(),
    listStudents(),
  ]);

  const canEdit = roleHasCapability(user.role, "manageEnrollments");
  const canViewStudents = roleHasCapability(user.role, "viewStudents");

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Matrículas</h1>
      <EnrollmentsClient
        enrollments={enrollments}
        courses={courses}
        platforms={platforms}
        tutors={tutors}
        students={students}
        canEdit={canEdit}
        canViewStudents={canViewStudents}
      />
    </div>
  );
}
