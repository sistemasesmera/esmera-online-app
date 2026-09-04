import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.types";

export type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"];

export type LogActivityInput = {
  userId?: string | null;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  metadata?: Json;
  leadId?: string | null;
  studentId?: string | null;
  enrollmentId?: string | null;
};

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("activity_logs").insert({
      user_id: input.userId ?? null,
      user_name: input.userName,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
      description: input.description,
      metadata: input.metadata ?? {},
      lead_id: input.leadId ?? null,
      student_id: input.studentId ?? null,
      enrollment_id: input.enrollmentId ?? null,
    });
  } catch {
    // Never let logging crash the main flow
  }
}

export async function getActivityByLead(leadId: string): Promise<ActivityLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getActivityByStudent(studentId: string): Promise<ActivityLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getLeadActivityForStudent(studentId: string): Promise<ActivityLogRow[]> {
  const supabase = await createClient();
  // Look up the lead_id this student was converted from
  const { data: student } = await supabase
    .from("students")
    .select("lead_id")
    .eq("id", studentId)
    .single();

  if (!student?.lead_id) return [];

  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("lead_id", student.lead_id)
    .is("student_id", null)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getActivityByEnrollment(enrollmentId: string): Promise<ActivityLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .or(`enrollment_id.eq.${enrollmentId},and(entity_type.eq.enrollment,entity_id.eq.${enrollmentId})`)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getActivityByOpportunity(opportunityId: string): Promise<ActivityLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("entity_type", "opportunity")
    .eq("entity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getAllActivity(limit = 200): Promise<ActivityLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
