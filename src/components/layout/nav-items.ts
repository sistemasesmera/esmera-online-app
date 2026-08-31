import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookMarked,
  BookOpen,
  Bot,
  ClipboardList,
  Code2,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
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
      {
        label: "Conversaciones",
        href: "/conversaciones",
        icon: MessageSquare,
        roles: ["tech", "jefe_comercial", "comercial", "administracion"],
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
        label: "Tutorías",
        href: "/tutoring",
        icon: BookMarked,
        roles: ["tech", "administracion", "jefe_comercial", "tutor"],
      },
      {
        label: "Cursos",
        href: "/courses",
        icon: BookOpen,
        roles: ["tech", "administracion", "jefe_comercial", "comercial"],
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
      { label: "IA Interna", href: "/admin/ia-interna", icon: Bot, roles: ["tech"] },
      { label: "Agente IA Web", href: "/admin/agente-ia", icon: Bot, roles: ["tech"] },
      { label: "Logs", href: "/admin/logs", icon: ClipboardList, roles: ["tech"] },
      { label: "API", href: "/api", icon: Code2, roles: ["tech"] },
    ],
  },
];

export function getNavSectionsForRole(role: AppRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
