import type { ReactNode } from "react";

import type { AppRole } from "@/lib/domain/shared/permissions";

/**
 * Oculta `children` si `role` no está en `allow`. Es una capa cosmética de
 * UI: la autorización real vive en requireRole() (Server Actions) y en RLS.
 */
export function RoleGate({
  role,
  allow,
  children,
}: {
  role: AppRole;
  allow: readonly AppRole[];
  children: ReactNode;
}) {
  if (!allow.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
