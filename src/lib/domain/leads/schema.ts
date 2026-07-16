import { z } from "zod";

import type { LeadSource, LeadStatus } from "@/types/database.types";

export const LEAD_STATUSES: LeadStatus[] = ["nuevo", "contactado", "cualificado", "convertido", "descartado"];
export const LEAD_SOURCES: LeadSource[] = ["web", "meta_ads", "organico"];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  cualificado: "Cualificado",
  convertido: "Convertido",
  descartado: "Descartado",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  web: "Web",
  meta_ads: "Meta Ads",
  organico: "Orgánico",
};

export const LEAD_STATUS_TRANSITIONS: Record<import("@/types/database.types").LeadStatus, import("@/types/database.types").LeadStatus[]> = {
  nuevo:      ["contactado", "descartado"],
  contactado: ["cualificado", "descartado"],
  cualificado: ["descartado"],
  convertido: [],
  descartado: ["nuevo"],
};

export const LEAD_TRANSITION_LABELS: Partial<Record<import("@/types/database.types").LeadStatus, string>> = {
  contactado:  "Contactar",
  cualificado: "Cualificar",
  descartado:  "Descartar",
  nuevo:       "Reactivar",
};

// Orígenes disponibles al crear un lead manualmente.
// "web" y "meta_ads" se asignan solo por integraciones automáticas.
export const MANUAL_LEAD_SOURCES: LeadSource[] = ["organico"];

export const leadSchema = z.object({
  full_name: z.string().min(1, "Requerido"),
  email: z.string().optional(),
  phone: z.string().min(1, "El teléfono es requerido"),
  source: z.enum(LEAD_SOURCES as [LeadSource, ...LeadSource[]]),
  status: z.enum(LEAD_STATUSES as [LeadStatus, ...LeadStatus[]]),
  interested_course: z.string().optional(),
  notes: z.string().optional(),
  owner_id: z.string().optional(),
  // Datos para contrato
  dni_nie: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  birth_date: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
