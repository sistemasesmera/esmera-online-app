import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar role={user.role} user={user} />
      <SidebarInset>
        <AppTopbar user={user} />
        <main className="flex-1 p-6 min-h-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
