import { LogOut, Settings } from "lucide-react";

import { NotificationBell } from "@/components/features/notifications/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ROLE_LABELS } from "@/lib/domain/shared/permissions";
import { signOut } from "@/lib/auth/sign-out";
import type { CurrentUser } from "@/lib/auth/get-current-user";

function initialsOf(fullName: string) {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppTopbar({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card/80 backdrop-blur-sm px-4">
      <div className="flex items-center gap-1">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" />
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell userId={user.id} />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 rounded-full p-0 hover:ring-2 hover:ring-primary/20 transition-all"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initialsOf(user.fullName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground">{user.fullName}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="flex w-full cursor-pointer items-center gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
