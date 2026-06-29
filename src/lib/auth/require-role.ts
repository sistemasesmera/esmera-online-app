import "server-only";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/get-current-user";
import type { AppRole } from "@/lib/domain/shared/permissions";

/**
 * Barrera de autorización real para Server Actions / route handlers.
 * Lanza si no hay sesión o el rol no está permitido — la RLS de Postgres
 * es la barrera final, pero esta evita siquiera intentar la query.
 */
export async function requireRole(allowedRoles: readonly AppRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error(`El rol "${user.role}" no tiene permiso para esta acción`);
  }

  return user;
}
