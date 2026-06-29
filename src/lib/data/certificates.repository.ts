import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CertificateStatus, Database } from "@/types/database.types";

export type CertificateRow = Database["public"]["Tables"]["certificates"]["Row"];

export type CertificateWithJoins = CertificateRow & {
  enrollments: {
    students: { full_name: string } | null;
    courses: { name: string } | null;
  } | null;
  users: { full_name: string } | null;
};

export type EnrollmentForCertificate = {
  id: string;
  students: { full_name: string } | null;
  courses: { name: string } | null;
};

export async function listCertificates(): Promise<CertificateWithJoins[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select(`
      id, enrollment_id, status, document_url, issued_at, created_at, updated_at, deleted_at, issued_by,
      enrollments!enrollment_id(students!student_id(full_name), courses!course_id(name)),
      users!issued_by(full_name)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CertificateWithJoins[];
}

export async function getEnrollmentsForCertificate(): Promise<EnrollmentForCertificate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select("id, students!student_id(full_name), courses!course_id(name)")
    .in("status", ["activa", "finalizada"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentForCertificate[];
}

export async function getCertificatesByEnrollments(enrollmentIds: string[]): Promise<CertificateWithJoins[]> {
  if (enrollmentIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select(`
      id, enrollment_id, status, document_url, issued_at, created_at, updated_at, deleted_at, issued_by,
      enrollments!enrollment_id(students!student_id(full_name), courses!course_id(name)),
      users!issued_by(full_name)
    `)
    .in("enrollment_id", enrollmentIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CertificateWithJoins[];
}

export { CertificateStatus };
