import { z } from "zod";

export const createCourseSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  code: z.string().optional(),
  description: z.string().optional(),
  duration_hours: z.number().int("Debe ser entero").min(1, "Mínimo 1 hora").optional(),
  is_fundae: z.boolean(),
  is_certificado_profesionalidad: z.boolean(),
});

export const updateCourseSchema = createCourseSchema.extend({
  is_active: z.boolean(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
