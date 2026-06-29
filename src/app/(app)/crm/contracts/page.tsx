import { ContractsClient } from "@/components/features/crm/contracts/contracts-client";
import { requireRole } from "@/lib/auth/require-role";
import { listContracts } from "@/lib/data/contracts.repository";
import { listStudents } from "@/lib/data/students.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function ContractsPage() {
  const user = await requireRole(CAPABILITIES.createContracts);

  const [contracts, students] = await Promise.all([
    listContracts(),
    listStudents(),
  ]);

  const canCreate = roleHasCapability(user.role, "createContracts");
  const canEdit = roleHasCapability(user.role, "manageContracts");

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Contratos</h1>
      <ContractsClient
        contracts={contracts}
        students={students}
        canCreate={canCreate}
        canEdit={canEdit}
      />
    </div>
  );
}
