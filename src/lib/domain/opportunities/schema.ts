import { z } from "zod";

export const opportunitySchema = z.object({
  lead_id: z.string().min(1, "Requerido"),
  stage_id: z.string().min(1, "Requerido"),
  course_id: z.string().optional(),
  estimated_amount: z.number().positive("Debe ser positivo").optional(),
  owner_id: z.string().min(1, "Requerido"),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;
