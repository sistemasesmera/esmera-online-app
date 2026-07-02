"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import {
  createContractSchema,
  CONTRACT_STATUS_TRANSITIONS,
  type CreateContractInput,
} from "@/lib/domain/contracts/schema";
import { sendNotificationsToRole } from "@/lib/data/notifications.repository";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ContractStatus } from "@/types/database.types";

type ActionResult = { error: string | null; success: boolean };

export async function createContract(input: CreateContractInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.createContracts);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = createContractSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const { student_id, document_url, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("contracts").insert({
    ...rest,
    student_id: student_id || null,
    document_url: document_url || null,
    created_by: currentUser.id,
  });

  if (error) return { error: error.message, success: false };
  revalidatePath("/crm/contracts");
  return { error: null, success: true };
}

export async function updateContractStatus(id: string, newStatus: ContractStatus): Promise<ActionResult> {
  try {
    await requireRole(CAPABILITIES.manageContracts);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const supabase = await createClient();
  const { data: current } = await supabase.from("contracts").select("status").eq("id", id).single();
  if (!current) return { error: "Contrato no encontrado", success: false };

  const validNext = CONTRACT_STATUS_TRANSITIONS[current.status as ContractStatus];
  if (!validNext.includes(newStatus)) {
    return { error: `Transición no permitida: ${current.status} → ${newStatus}`, success: false };
  }

  const updateData =
    newStatus === "firmado"
      ? { status: newStatus, signed_at: new Date().toISOString() }
      : { status: newStatus };

  const { error } = await supabase.from("contracts").update(updateData).eq("id", id);
  if (error) return { error: error.message, success: false };

  if (newStatus === "firmado") {
    await sendNotificationsToRole("jefe_comercial", {
      type: "nueva_venta",
      title: "Contrato firmado — nueva venta",
      message: "Un contrato ha sido marcado como firmado.",
      related_entity_type: "contract",
      related_entity_id: id,
    });
  }

  revalidatePath("/crm/contracts");
  return { error: null, success: true };
}
