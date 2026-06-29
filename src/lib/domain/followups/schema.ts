import { z } from "zod";

import type { ContactType, FollowupStudentStatus } from "@/types/database.types";

export const CONTACT_TYPES: ContactType[] = [
  "llamada", "correo", "videollamada",
];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  correo: "Email",
  llamada: "Llamada",
  videollamada: "Videollamada",
  whatsapp: "WhatsApp",
  otro: "Otro",
};

export const FOLLOWUP_STATUSES: FollowupStudentStatus[] = [
  "activo", "pendiente", "sin_actividad", "riesgo_abandono", "finalizado",
];

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStudentStatus, string> = {
  activo: "Activo",
  pendiente: "Pendiente",
  sin_actividad: "Sin actividad",
  riesgo_abandono: "Riesgo de abandono",
  finalizado: "Finalizado",
};

export const createFollowupSchema = z.object({
  enrollment_id: z.string().uuid("Selecciona una matrícula"),
  contact_type: z.enum(CONTACT_TYPES as [ContactType, ...ContactType[]]),
  notes: z.string().min(1, "Las notas son requeridas"),
  followup_date: z.string().min(1, "La fecha es requerida"),
});

export type CreateFollowupInput = z.infer<typeof createFollowupSchema>;
