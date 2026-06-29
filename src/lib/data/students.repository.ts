import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type StudentRow = Database["public"]["Tables"]["students"]["Row"];
export type StudentWithComercial = StudentRow & {
  assigned_user: { full_name: string } | null;
};

const STUDENT_SELECT = "*, assigned_user:users!assigned_to(full_name)";

export async function listStudents(): Promise<StudentWithComercial[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(STUDENT_SELECT)
    .is("deleted_at", null)
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as StudentWithComercial[];
}

export async function getStudentById(id: string): Promise<StudentWithComercial | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select(STUDENT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  return data as unknown as StudentWithComercial | null;
}
