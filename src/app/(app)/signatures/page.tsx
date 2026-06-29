import { SignaturesClient } from "@/components/features/signatures/signatures-client";
import { requireRole } from "@/lib/auth/require-role";
import { listSignatureContracts } from "@/lib/data/signatures.repository";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";

export default async function SignaturesPage() {
  await requireRole(CAPABILITIES.viewEnrollments);
  const contracts = await listSignatureContracts();

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Firma Electrónica</h1>
      <SignaturesClient contracts={contracts} />
    </div>
  );
}
