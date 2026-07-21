import { z } from "zod";

import type { LeadSource, LeadStatus } from "@/types/database.types";

export type DiscardReason = "no_interesado" | "otra_academia" | "sin_valor" | "precio" | "otro";

export const DISCARD_REASONS: DiscardReason[] = [
  "no_interesado",
  "otra_academia",
  "sin_valor",
  "precio",
  "otro",
];

export const DISCARD_REASON_LABELS: Record<DiscardReason, string> = {
  no_interesado: "No está interesado",
  otra_academia: "Eligió otra academia",
  sin_valor:     "No ve valor en el curso",
  precio:        "Precio elevado",
  otro:          "Otro",
};

export const LEAD_STATUSES: LeadStatus[] = ["nuevo", "en_contacto", "oferta_enviada", "convertido", "descartado"];
export const LEAD_SOURCES: LeadSource[] = ["web", "meta_ads", "organico", "referido", "redes_sociales", "llamada_entrante", "evento", "agente_web", "otro"];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  en_contacto:    "En contacto",
  oferta_enviada: "Oferta enviada",
  convertido: "Convertido",
  descartado: "Descartado",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  web: "Web",
  meta_ads: "Meta Ads",
  organico: "Orgánico",
  referido: "Referido",
  redes_sociales: "Redes Sociales",
  llamada_entrante: "Llamada",
  evento: "Evento",
  agente_web: "Agente Web",
  otro: "Otro",
};

export const LEAD_STATUS_TRANSITIONS: Record<import("@/types/database.types").LeadStatus, import("@/types/database.types").LeadStatus[]> = {
  nuevo:          ["en_contacto", "descartado"],
  en_contacto:    ["oferta_enviada", "descartado"],
  oferta_enviada: ["descartado"],
  convertido: [],
  descartado: ["nuevo"],
};

export const LEAD_TRANSITION_LABELS: Partial<Record<import("@/types/database.types").LeadStatus, string>> = {
  en_contacto:    "En contacto",
  oferta_enviada: "Oferta enviada",
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
