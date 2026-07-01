import { TutoringClient } from "@/components/features/tutoring/tutoring-client";
import { requireRole } from "@/lib/auth/require-role";
import {
  getActiveEnrollmentsByTutor,
  getAllActiveEnrollments,
  listFollowupsByTutor,
  listAllFollowups,
} from "@/lib/data/followups.repository";
import { getTutorByUserId } from "@/lib/data/tutors.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function TutoringPage() {
  const user = await requireRole(CAPABILITIES.manageFollowups);
  const isAdmin = roleHasCapability(user.role, "viewAllEnrollments");

  let activeEnrollments;
  let followups;

  if (isAdmin) {
    [activeEnrollments, followups] = await Promise.all([
      getAllActiveEnrollments(),
      listAllFollowups(),
    ]);
  } else {
    const tutorRecord = await getTutorByUserId(user.id);
    if (!tutorRecord) {
      return (
        <div>
          <h1 className="text-2xl font-bold mb-4">Tutorías</h1>
          <p className="text-muted-foreground">
            Tu cuenta no tiene perfil de tutor activo. Contacta con el administrador.
          </p>
        </div>
      );
    }
    [activeEnrollments, followups] = await Promise.all([
      getActiveEnrollmentsByTutor(tutorRecord.id),
      listFollowupsByTutor(tutorRecord.id),
    ]);
  }

  const canAdd = roleHasCapability(user.role, "recordFollowup");

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Tutorías</h1>
      <TutoringClient
        activeEnrollments={activeEnrollments}
        followups={followups}
        canAdd={canAdd}
        showTutor={isAdmin}
      />
    </div>
  );
}
