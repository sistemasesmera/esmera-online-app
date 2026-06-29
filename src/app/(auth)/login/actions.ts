"use server";

import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(input: { email: string; password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return { error: "Email o contraseña incorrectos" };
  }

  return { error: null };
}
