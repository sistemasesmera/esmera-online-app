import { StudentsClient } from "@/components/features/students/students-client";
import { listStudents } from "@/lib/data/students.repository";
import { requireRole } from "@/lib/auth/require-role";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function StudentsPage() {
  const user = await requireRole(CAPABILITIES.viewStudents);
  const students = await listStudents();

  const canEdit = roleHasCapability(user.role, "manageStudents");

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Alumnos</h1>
      <StudentsClient students={students} canEdit={canEdit} />
    </div>
  );
}
