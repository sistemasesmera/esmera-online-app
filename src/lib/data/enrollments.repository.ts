import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CashMethod, ContractStatus, EnrollmentStatus, Financer, PaymentType } from "@/types/database.types";

export type ContractBasic = {
  id: string;
  status: ContractStatus;
  amount: number;
  payment_type: PaymentType | null;
  cash_method: CashMethod | null;
  cash_amount: number | null;
  financer: Financer | null;
  financed_amount: number | null;
  document_url: string | null;
  signed_at: string | null;
  sent_at: string | null;
  docuseal_submission_id: string | null;
  docuseal_signing_url: string | null;
  declined_at: string | null;
};

export type EnrollmentWithCourse = {
  id: string;
  enrollment_number: number;
  student_id: string;
  course_id: string;
  platform_id: string | null;
  tutor_id: string | null;
  status: EnrollmentStatus;
  enrollment_date: string;
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  notes: string | null;
  created_at: string;
  courses: { name: string; code: string | null } | null;
  platforms: { name: string } | null;
  tutors: { users: { full_name: string } | null } | null;
  contracts: ContractBasic[];
};

export type EnrollmentWithStudent = EnrollmentWithCourse & {
  students: { id: string; full_name: string; dni_nie: string } | null;
};

const ENROLLMENT_SELECT = `
  id, enrollment_number, student_id, course_id, platform_id, tutor_id, status,
  enrollment_date, start_date, end_date, duration_months, notes, created_at,
  courses!course_id(name, code),
  platforms!platform_id(name),
  tutors!tutor_id(users!user_id(full_name)),
  contracts!enrollment_id(id, status, amount, payment_type, cash_method, cash_amount, financer, financed_amount, document_url, signed_at, sent_at, docuseal_submission_id, docuseal_signing_url, declined_at)
` as const;

export async function getEnrollmentsByStudent(studentId: string): Promise<EnrollmentWithCourse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentWithCourse[];
}

export type EnrollmentFicha = EnrollmentWithCourse & {
  students: {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    dni_nie: string;
    email: string;
    phone: string | null;
    address: string | null;
    province: string | null;
    postal_code: string | null;
    birth_date: string | null;
  } | null;
};

export async function getEnrollmentById(id: string): Promise<EnrollmentFicha | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select(`${ENROLLMENT_SELECT}, students!student_id(id, full_name, first_name, last_name, dni_nie, email, phone, address, province, postal_code, birth_date)`)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  return data ? (data as unknown as EnrollmentFicha) : null;
}

type ListEnrollmentsFilter =
  | { createdBy: string }
  | { tutorId: string }
  | undefined;

export async function listEnrollments(filter?: ListEnrollmentsFilter): Promise<EnrollmentWithStudent[]> {
  const supabase = await createClient();
  let query = supabase
    .from("enrollments")
    .select(`${ENROLLMENT_SELECT}, students!student_id(id, full_name, dni_nie)`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filter && "createdBy" in filter) {
    query = query.eq("created_by", filter.createdBy);
  } else if (filter && "tutorId" in filter) {
    query = query.eq("tutor_id", filter.tutorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentWithStudent[];
}
