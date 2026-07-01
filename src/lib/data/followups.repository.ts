import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ContactType, FollowupStudentStatus } from "@/types/database.types";

export type EnrollmentForFollowup = {
  id: string;
  students: { full_name: string } | null;
  courses: { name: string } | null;
};

export type FollowupWithJoins = {
  id: string;
  contact_type: ContactType;
  student_status_snapshot: FollowupStudentStatus;
  notes: string;
  followup_date: string;
  created_at: string;
  enrollments: {
    students: { full_name: string } | null;
    courses: { name: string } | null;
  } | null;
  tutors: { users: { full_name: string } | null } | null;
};

const ENROLLMENT_SELECT = "id, students!student_id(full_name), courses!course_id(name)" as const;

export async function getActiveEnrollmentsByTutor(tutorId: string): Promise<EnrollmentForFollowup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("tutor_id", tutorId)
    .eq("status", "activa")
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentForFollowup[];
}

export async function getAllActiveEnrollments(): Promise<EnrollmentForFollowup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("status", "activa")
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EnrollmentForFollowup[];
}

const FOLLOWUP_SELECT = `
  id, contact_type, student_status_snapshot, notes, followup_date, created_at,
  enrollments!enrollment_id(students!student_id(full_name), courses!course_id(name)),
  tutors!tutor_id(users!user_id(full_name))
` as const;

export async function listFollowupsByTutor(tutorId: string): Promise<FollowupWithJoins[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tutor_followups")
    .select(FOLLOWUP_SELECT)
    .eq("tutor_id", tutorId)
    .order("followup_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FollowupWithJoins[];
}

export async function listAllFollowups(): Promise<FollowupWithJoins[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tutor_followups")
    .select(FOLLOWUP_SELECT)
    .order("followup_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FollowupWithJoins[];
}

export type FollowupForStudent = {
  id: string;
  enrollment_id: string;
  contact_type: ContactType;
  student_status_snapshot: FollowupStudentStatus;
  notes: string;
  followup_date: string;
  created_at: string;
  enrollments: { courses: { name: string } | null } | null;
  creator: { full_name: string } | null;
};

export async function getFollowupsByEnrollments(enrollmentIds: string[]): Promise<FollowupForStudent[]> {
  if (enrollmentIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tutor_followups")
    .select(`
      id, enrollment_id, contact_type, student_status_snapshot, notes, followup_date, created_at,
      enrollments!enrollment_id(courses!course_id(name)),
      creator:users!created_by(full_name)
    `)
    .in("enrollment_id", enrollmentIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FollowupForStudent[];
}
