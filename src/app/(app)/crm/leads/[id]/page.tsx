import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LeadFichaClient } from "@/components/features/crm/leads/lead-ficha-client";
import { requireRole } from "@/lib/auth/require-role";
import { listCourses } from "@/lib/data/courses.repository";
import { listLeadInteractions } from "@/lib/data/lead-interactions.repository";
import { getLeadWithJoins } from "@/lib/data/leads.repository";
import { listUsers } from "@/lib/data/users.repository";
import { CAPABILITIES, roleHasCapability } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/data/attachments.shared";
import type { AttachmentWithUrl, AttachmentWithUsers } from "@/lib/data/attachments.shared";
import { getActivityByLead } from "@/lib/data/activity-logs.repository";

async function listLeadAttachments(leadId: string): Promise<AttachmentWithUrl[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_attachments")
    .select("*, users!uploaded_by(full_name)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  const rows = data as unknown as AttachmentWithUsers[];

  return Promise.all(
    rows.map(async (row) => {
      const { data: urlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.file_path, 3600);
      return { ...row, signed_url: urlData?.signedUrl ?? null };
    })
  );
}

export default async function LeadFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(CAPABILITIES.manageLeads);

  const [lead, interactions, attachments, activityLogs, courses, users] = await Promise.all([
    getLeadWithJoins(id),
    listLeadInteractions(id),
    listLeadAttachments(id),
    getActivityByLead(id),
    listCourses(),
    listUsers(),
  ]);

  if (!lead) notFound();

  // Cuando el lead está convertido, busca la matrícula del alumno para que el comercial pueda firmar
  let convertedEnrollmentId: string | null = null;
  if (lead.converted_to_student_id) {
    const supabase = await createClient();
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", lead.converted_to_student_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    convertedEnrollmentId = enrollment?.id ?? null;
  }

  const canEdit = roleHasCapability(user.role, "manageLeads");
  const canAssign = roleHasCapability(user.role, "assignLeads");
  const currentUserName = users.find((u) => u.id === user.id)?.full_name ?? "Yo";

  return (
    <div className="max-w-[1200px]">
      <Link
        href="/crm/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 group"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Leads</span>
      </Link>
      <LeadFichaClient
        lead={lead}
        interactions={interactions}
        attachments={attachments}
        activityLogs={activityLogs}
        courses={courses}
        users={users}
        currentUserId={user.id}
        currentUserName={currentUserName}
        canEdit={canEdit}
        canAssign={canAssign}
        convertedEnrollmentId={convertedEnrollmentId}
      />
    </div>
  );
}
