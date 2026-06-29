"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { createCertificateSchema, CERT_STATUS_TRANSITIONS, type CreateCertificateInput } from "@/lib/domain/certificates/schema";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";
import type { CertificateStatus } from "@/types/database.types";

type ActionResult = { error: string | null; success: boolean };

export async function createCertificate(input: CreateCertificateInput): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageCertificates);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = createCertificateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("certificates").insert({
    enrollment_id: parsed.data.enrollment_id,
    document_url: parsed.data.document_url || null,
  });

  if (error) return { error: error.message, success: false };
  revalidatePath("/certificates");
  return { error: null, success: true };
}

export async function attachCertificateDocument(id: string, documentUrl: string): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageCertificates);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("certificates")
    .update({ document_url: documentUrl })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/certificates");
  revalidatePath("/enrollments");
  return { error: null, success: true };
}

export async function updateCertificateStatus(
  id: string,
  newStatus: CertificateStatus,
  document_url?: string
): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageCertificates);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("certificates")
    .select("status")
    .eq("id", id)
    .single();

  if (!current) return { error: "Certificado no encontrado", success: false };

  const validNext = CERT_STATUS_TRANSITIONS[current.status as CertificateStatus];
  if (!validNext.includes(newStatus)) {
    return { error: `Transición no permitida: ${current.status} → ${newStatus}`, success: false };
  }

  if (newStatus === "emitido") {
    const emitData: { status: CertificateStatus; issued_at: string; issued_by: string; document_url?: string | null } = {
      status: newStatus,
      issued_at: new Date().toISOString(),
      issued_by: currentUser.id,
    };
    if (document_url) emitData.document_url = document_url;
    const { error } = await supabase.from("certificates").update(emitData).eq("id", id);
    if (error) return { error: error.message, success: false };
  } else {
    const { error } = await supabase.from("certificates").update({ status: newStatus }).eq("id", id);
    if (error) return { error: error.message, success: false };
  }

  revalidatePath("/certificates");
  return { error: null, success: true };
}
