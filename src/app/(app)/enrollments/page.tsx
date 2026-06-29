import { EnrollmentsClient } from "@/components/features/enrollments/enrollments-client";
import { requireRole } from "@/lib/auth/require-role";
import { listCourses } from "@/lib/data/courses.repository";
import { listEnrollments } from "@/lib/data/enrollments.repository";
import { listPlatforms } from "@/lib/data/platforms.repository";
import { listStudents } from "@/lib/data/students.repository";
import { listActiveTutors } from "@/lib/data/tutors.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function EnrollmentsPage() {
  const user = await requireRole(CAPABILITIES.viewEnrollments);

  const [enrollments, courses, platforms, tutors, students] = await Promise.all([
    listEnrollments(),
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
