"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getNavSectionsForRole } from "@/components/layout/nav-items";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import type { AppRole } from "@/lib/domain/shared/permissions";
import { ROLE_LABELS } from "@/lib/domain/shared/permissions";

function initials(fullName: string) {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppSidebar({ role, user }: { role: AppRole; user: CurrentUser }) {
  const pathname = usePathname();
  const sections = getNavSectionsForRole(role);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Brand header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent focus-visible:ring-0">
              <Link href="/dashboard">
                {/* Logo mark — visible in both states */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
                  <span className="text-sm font-black text-primary-foreground tracking-tighter">E</span>
                </div>
                {/* Brand text — hidden when collapsed */}
                <div className="grid flex-1 text-left leading-tight">
                  <span className="font-bold text-sidebar-accent-foreground text-sm tracking-tight">
                    Esmera
                  </span>
                  <span className="text-[10px] text-sidebar-foreground/50 font-medium tracking-wide uppercase">
                    Online Manager
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="py-2">
        {sections.map((section, index) => (
          <SidebarGroup key={section.label ?? `section-${index}`} className="px-2 py-0">
            {section.label && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-1">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="rounded-md h-9 gap-3 text-sidebar-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={`${user.fullName} · ${ROLE_LABELS[user.role]}`}
              className="hover:bg-sidebar-accent cursor-default"
            >
              {/* Avatar — always visible */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/25 ring-1 ring-primary/30">
                <span className="text-xs font-bold text-primary-foreground/90">
                  {initials(user.fullName)}
                </span>
              </div>
              {/* Info — hidden when collapsed */}
              <div className="grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">
                  {user.fullName}
                </span>
                <span className="truncate text-[10px] text-sidebar-foreground/50 uppercase tracking-wide font-medium">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
