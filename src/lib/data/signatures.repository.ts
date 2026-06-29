import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CashMethod, ContractStatus, Financer, PaymentType } from "@/types/database.types";

export type SignatureContract = {
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
  created_at: string;
  updated_at: string;
  enrollment_id: string;
  enrollments: {
    id: string;
    enrollment_number: number;
    course_id: string;
    courses: { name: string } | null;
  } | null;
  students: { full_name: string; email: string } | null;
};

export async function listSignatureContracts(): Promise<SignatureContract[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(`
      id, status, amount, document_url, signed_at, sent_at, docuseal_submission_id,
      payment_type, cash_method, cash_amount, financer, financed_amount,
      created_at, updated_at,
      enrollment_id,
      enrollments!enrollment_id(id, enrollment_number, course_id, courses!course_id(name)),
      students!student_id(full_name, email)
    `)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as SignatureContract[];
}
