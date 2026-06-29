import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/domain/shared/permissions";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
};

/**
 * Lee la sesión de Supabase Auth + el perfil de `public.users`.
 * Cacheado por request (React.cache) para evitar leer la sesión repetidas
 * veces en el mismo árbol de Server Components.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .eq("id", authData.user.id)
    .single();

  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  };
});
