import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

export async function listCourses(): Promise<CourseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}
