import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TutorWithUser = {
  id: string;
  specialty: string | null;
  is_active: boolean;
  users: { full_name: string } | null;
};

export async function getTutorByUserId(userId: string): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tutors")
    .select("id")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function listActiveTutors(): Promise<TutorWithUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tutors")
    .select("id, specialty, is_active, users!user_id(full_name)")
    .eq("is_active", true)
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []) as TutorWithUser[];
}
