import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  PenLine,
  Target,
  UserCog,
  Users,
} from "lucide-react";

import type { AppRole } from "@/lib/domain/shared/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: readonly AppRole[];
};

export type NavSection = {
  label: string | null;
  items: NavItem[];
};

const ALL_ROLES: readonly AppRole[] = ["tech", "jefe_comercial", "comercial", "administracion", "tutor"];

export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES }],
  },
  {
    label: "CRM Comercial",
    items: [
      {
        label: "Leads",
        href: "/crm/leads",
        icon: Target,
        roles: ["tech", "jefe_comercial", "comercial"],
      },
    ],
  },
  {
    label: "Operativa",
    items: [
      {
        label: "Alumnos",
        href: "/students",
        icon: Users,
        roles: ["tech", "administracion", "jefe_comercial", "comercial"],
      },
      {
        label: "Matrículas",
        href: "/enrollments",
        icon: GraduationCap,
        roles: ["tech", "administracion", "jefe_comercial", "comercial", "tutor"],
      },
      {
        label: "Cursos",
        href: "/courses",
        icon: BookOpen,
        roles: ["tech", "administracion"],
      },
      {
        label: "Firmas",
        href: "/signatures",
        icon: PenLine,
        roles: ["tech", "administracion", "jefe_comercial"],
      },
    ],
  },
  {
    label: "General",
    items: [
      { label: "Notificaciones", href: "/notifications", icon: Bell, roles: ALL_ROLES },
    ],
  },
  {
    label: "Administración",
    items: [
      { label: "Usuarios", href: "/admin/users", icon: UserCog, roles: ["tech"] },
      { label: "Logs", href: "/admin/logs", icon: ClipboardList, roles: ["tech"] },
    ],
  },
];

export function getNavSectionsForRole(role: AppRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
