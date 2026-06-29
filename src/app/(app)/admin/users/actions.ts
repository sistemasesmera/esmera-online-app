"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/lib/domain/users/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; success: boolean };

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageUsers);
  } catch {
    return { error: "No autorizado", success: false };
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const { full_name, email, role, phone, password } = parsed.data;
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Error al crear el usuario en Auth", success: false };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("users").insert({
    id: authData.user.id,
    full_name,
    email,
    role,
    phone: phone || null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message, success: false };
  }

  // Si el rol es tutor, crear su perfil en la tabla tutors
  if (role === "tutor") {
    await supabase.from("tutors").insert({ user_id: authData.user.id, is_active: true });
  }

  revalidatePath("/admin/users");
  return { error: null, success: true };
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageUsers);
  } catch {
    return { error: "No autorizado", success: false };
  }

  if (!input.is_active && currentUser.id === id) {
    return { error: "No puedes desactivar tu propia cuenta", success: false };
  }

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ ...parsed.data, phone: parsed.data.phone || null })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/admin/users");
  return { error: null, success: true };
}

export async function toggleUserActive(id: string, isActive: boolean): Promise<ActionResult> {
  let currentUser;
  try {
    currentUser = await requireRole(CAPABILITIES.manageUsers);
  } catch {
    return { error: "No autorizado", success: false };
  }

  if (!isActive && currentUser.id === id) {
    return { error: "No puedes desactivar tu propia cuenta", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ is_active: isActive }).eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/admin/users");
  return { error: null, success: true };
}
