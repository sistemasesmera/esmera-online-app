import type { Metadata } from "next";
export const metadata: Metadata = { title: "Cursos" };

import { CoursesClient } from "@/components/features/courses/courses-client";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listCourses } from "@/lib/data/courses.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function CoursesPage() {
  const [user, courses] = await Promise.all([getCurrentUser(), listCourses()]);

  const canEdit = !!user && roleHasCapability(user.role, "manageCourses");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cursos</h1>
        <p className="text-muted-foreground">Catálogo de cursos disponibles en la academia.</p>
      </div>
      <CoursesClient courses={courses} canEdit={canEdit} />
    </div>
  );
}
