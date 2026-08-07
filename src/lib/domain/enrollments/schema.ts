import { z } from "zod";

import type { EnrollmentStatus } from "@/types/database.types";

export type AcademyOrigin = "logrono_presencial" | "madrid_presencial";

export const ACADEMY_ORIGIN_LABELS: Record<AcademyOrigin, string> = {
  logrono_presencial: "Logroño Presencial",
  madrid_presencial: "Madrid Presencial",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pendiente_validar: "Pendiente validar · Web",
  pendiente: "Pendiente de confirmar",
  validada: "Validada",
  activa: "En curso",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export const ENROLLMENT_STATUS_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  pendiente_validar: ["pendiente", "cancelada"],
  pendiente: ["validada", "cancelada"],
  validada: ["activa", "cancelada"],
  activa: ["finalizada", "cancelada"],
  finalizada: [],
  cancelada: [],
};

export const TRANSITION_LABELS: Partial<Record<`${EnrollmentStatus}->${EnrollmentStatus}`, string>> = {
  "pendiente_validar->pendiente": "Confirmar contacto",
  "pendiente_validar->cancelada": "Cancelar",
  "pendiente->validada": "Validar",
  "validada->activa": "Activar",
  "activa->finalizada": "Finalizar",
  "pendiente->cancelada": "Cancelar",
  "validada->cancelada": "Cancelar",
  "activa->cancelada": "Cancelar",
};

export function getTransitionLabel(from: EnrollmentStatus, to: EnrollmentStatus): string {
  return TRANSITION_LABELS[`${from}->${to}`] ?? to;
}

export const DURATION_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: i === 0 ? "1 mes" : `${i + 1} meses`,
}));

export const createEnrollmentSchema = z.object({
  student_id: z.string().uuid("Selecciona un alumno"),
  course_id: z.string().uuid("Selecciona un curso"),
  enrollment_date: z.string().min(1, "Requerida"),
  duration_months: z.number().int().min(1).max(12).nullable().optional(),
  amount: z.number().min(0).optional(),
  notes: z.string().optional(),
  academy_origin: z.enum(["logrono_presencial", "madrid_presencial"]).nullable().optional(),
  payment_type: z.enum(["contado", "financiado", "mixto"], "Selecciona una forma de pago"),
  cash_method: z.enum(["transferencia", "efectivo"]).nullable().optional(),
  cash_amount: z.number().nullable().optional(),
  financer: z.enum(["alma", "sabadell", "sequra", "esmera"]).nullable().optional(),
  financed_amount: z.number().nullable().optional(),
}).superRefine((data, ctx) => {
  if ((data.payment_type === "contado" || data.payment_type === "mixto") && !data.cash_method) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica cómo se recibe el pago en contado", path: ["cash_method"] });
  }
  if ((data.payment_type === "financiado" || data.payment_type === "mixto") && !data.financer) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica la financiera", path: ["financer"] });
  }
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
