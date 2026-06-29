import { z } from "zod";

const codePattern = /^[a-z0-9_]+$/;
const codeMessage = "Solo minúsculas, números y guiones bajos";

export const createPlatformSchema = z.object({
  code: z.string().min(1, "Requerido").regex(codePattern, codeMessage),
  name: z.string().min(1, "Requerido"),
  is_active: z.boolean(),
});

export const updatePlatformSchema = z.object({
  name: z.string().min(1, "Requerido"),
  is_active: z.boolean(),
});

export const createPipelineStageSchema = z.object({
  code: z.string().min(1, "Requerido").regex(codePattern, codeMessage),
  name: z.string().min(1, "Requerido"),
  display_order: z.number().int("Debe ser entero").min(1, "Mínimo 1"),
  is_won: z.boolean(),
  is_lost: z.boolean(),
});

export const updatePipelineStageSchema = z.object({
  name: z.string().min(1, "Requerido"),
  display_order: z.number().int("Debe ser entero").min(1, "Mínimo 1"),
  is_won: z.boolean(),
  is_lost: z.boolean(),
});

export type CreatePlatformInput = z.infer<typeof createPlatformSchema>;
export type UpdatePlatformInput = z.infer<typeof updatePlatformSchema>;
export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;
export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;
