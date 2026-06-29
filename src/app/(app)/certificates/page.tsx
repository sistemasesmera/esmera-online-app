import { CertificatesClient } from "@/components/features/certificates/certificates-client";
import { requireRole } from "@/lib/auth/require-role";
import { listCertificates, getEnrollmentsForCertificate } from "@/lib/data/certificates.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";

export default async function CertificatesPage() {
  const user = await requireRole(CAPABILITIES.manageCertificates);

  const [certificates, enrollments] = await Promise.all([
    listCertificates(),
    getEnrollmentsForCertificate(),
  ]);

  const canEdit = roleHasCapability(user.role, "manageCertificates");

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-6">Certificados</h1>
      <CertificatesClient
        certificates={certificates}
        enrollments={enrollments}
        canEdit={canEdit}
      />
    </div>
  );
}
