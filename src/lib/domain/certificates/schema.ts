import { z } from "zod";

import type { CertificateStatus } from "@/types/database.types";

export const CERT_STATUS_LABELS: Record<CertificateStatus, string> = {
  pendiente: "Pendiente",
  emitido: "Emitido",
  anulado: "Anulado",
};

export const CERT_STATUS_TRANSITIONS: Record<CertificateStatus, CertificateStatus[]> = {
  pendiente: ["emitido", "anulado"],
  emitido: ["anulado"],
  anulado: [],
};

export const createCertificateSchema = z.object({
  enrollment_id: z.string().uuid("Selecciona una matrícula"),
  document_url: z.string().optional(),
});

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
