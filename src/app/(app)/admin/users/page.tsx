import { redirect } from "next/navigation";

import { RolePermissionsPanel } from "@/components/features/admin/role-permissions-panel";
import { UsersClient } from "@/components/features/admin/users-client";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listUsers } from "@/lib/data/users.repository";

export default async function UsersPage() {
  const current = await getCurrentUser();
  if (!current || current.role !== "tech") redirect("/dashboard");

  const users = await listUsers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">Gestiona los usuarios del sistema y sus roles.</p>
      </div>
      <RolePermissionsPanel />
      <UsersClient users={users} />
    </div>
  );
}
