import { z } from "zod";

import type { ContractStatus } from "@/types/database.types";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  firmado: "Firmado",
  anulado: "Anulado",
};

export const CONTRACT_STATUS_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  borrador: ["enviado", "anulado"],
  enviado: ["firmado", "anulado"],
  firmado: [],
  anulado: [],
};

export const TRANSITION_LABELS: Partial<Record<`${ContractStatus}->${ContractStatus}`, string>> = {
  "borrador->enviado": "Enviar",
  "enviado->firmado": "Marcar firmado",
  "borrador->anulado": "Anular",
  "enviado->anulado": "Anular",
};

export function getContractTransitionLabel(from: ContractStatus, to: ContractStatus): string {
  return TRANSITION_LABELS[`${from}->${to}`] ?? to;
}

export const createContractSchema = z.object({
  student_id: z.string().optional(),
  amount: z.number().positive("Debe ser un importe positivo"),
  document_url: z.string().optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
