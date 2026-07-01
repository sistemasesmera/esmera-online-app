import { z } from "zod";

import { APP_ROLES } from "@/lib/domain/shared/permissions";

export const createUserSchema = z.object({
  full_name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(APP_ROLES),
  phone: z.string().optional(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(2, "Mínimo 2 caracteres"),
  role: z.enum(APP_ROLES),
  phone: z.string().optional(),
  is_active: z.boolean(),
  password: z.string().min(8, "Mínimo 8 caracteres").optional().or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
