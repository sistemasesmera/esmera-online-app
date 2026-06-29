import { z } from "zod";

import type { StudentStatus } from "@/types/database.types";

export const STUDENT_STATUSES: StudentStatus[] = ["en_formacion", "expediente_cerrado"];

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  en_formacion: "En formación",
  expediente_cerrado: "Expediente cerrado",
};

export const createStudentSchema = z.object({
  first_name: z.string().min(1, "Requerido"),
  last_name: z.string().min(1, "Requerido"),
  dni_nie: z.string().min(1, "Requerido").transform((v) => v.trim().toUpperCase()),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  birth_date: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.extend({
  status: z.enum(STUDENT_STATUSES as [StudentStatus, ...StudentStatus[]]),
  assigned_to: z.string().nullable().optional(),
});

export const convertLeadSchema = z.object({
  first_name:    z.string().min(1, "Requerido"),
  last_name:     z.string().min(1, "Requerido"),
  dni_nie:       z.string().min(1, "Requerido").transform((v) => v.trim().toUpperCase()),
  email:         z.string().email("Email inválido"),
  phone:         z.string().min(1, "Requerido"),
  address:       z.string().min(1, "Requerida"),
  province:      z.string().min(1, "Requerida"),
  postal_code:   z.string().min(1, "Requerido"),
  birth_date:    z.string().min(1, "Requerida"),
  course_id:     z.string().uuid("Selecciona un curso"),
  enrollment_date: z.string().min(1, "Requerida"),
  amount:        z.number().min(0, "El importe no puede ser negativo"),
  notes:         z.string().optional(),
  payment_type:  z.enum(["contado", "financiado", "mixto"], "Selecciona una forma de pago"),
  cash_method:   z.enum(["transferencia", "efectivo"]).nullable().optional(),
  cash_amount:   z.number().nullable().optional(),
  financer:      z.enum(["alma", "sabadell", "sequra", "esmera"]).nullable().optional(),
  financed_amount: z.number().nullable().optional(),
}).superRefine((data, ctx) => {
  if ((data.payment_type === "contado" || data.payment_type === "mixto") && !data.cash_method) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica cómo se recibe el pago en contado", path: ["cash_method"] });
  }
  if ((data.payment_type === "financiado" || data.payment_type === "mixto") && !data.financer) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica la financiera", path: ["financer"] });
  }
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
