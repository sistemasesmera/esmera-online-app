"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RoleInfo = {
  label: string;
  badgeVariant: "default" | "secondary" | "outline";
  description: string;
  access: string[];
  noAccess: string[];
};

const ROLE_INFO: RoleInfo[] = [
  {
    label: "Tech",
    badgeVariant: "default",
    description: "Perfil técnico con acceso completo al sistema.",
    access: [
      "Gestión de usuarios y catálogos",
      "Todos los leads, oportunidades y contratos",
      "Gestión completa de alumnos y matrículas",
      "Emisión de certificados",
      "Logs de auditoría e informes",
    ],
    noAccess: [],
  },
  {
    label: "Jefe Comercial",
    badgeVariant: "default",
    description: "Supervisión completa del equipo comercial.",
    access: [
      "Ver y gestionar todos los leads y oportunidades",
      "Convertir leads en alumnos",
      "Ver todas las matrículas y adjuntar documentos",
      "Crear y firmar contratos",
    ],
    noAccess: [
      "Modificar estados de matrículas",
      "Gestión de alumnos, cursos o certificados",
      "Gestión de usuarios",
    ],
  },
  {
    label: "Comercial",
    badgeVariant: "secondary",
    description: "Gestiona su propia cartera asignada.",
    access: [
      "Sus propios leads y oportunidades",
      "Convertir sus leads en alumnos",
      "Ver sus matrículas asociadas y adjuntar documentos",
      "Crear contratos para sus leads",
    ],
    noAccess: [
      "Leads ni matrículas de otros comerciales",
      "Gestión de alumnos, cursos o certificados",
      "Gestión de usuarios",
    ],
  },
  {
    label: "Administración",
    badgeVariant: "secondary",
    description: "Gestión operativa: alumnos, matrículas y certificados.",
    access: [
      "Gestión completa de cursos",
      "Gestión completa de alumnos (crear, editar)",
      "Gestión completa de matrículas (estados, documentos)",
      "Ver qué comercial tiene asignado cada alumno",
      "Emisión y gestión de certificados",
      "Ver contratos",
    ],
    noAccess: [
      "Leads y oportunidades (CRM comercial)",
      "Gestión de usuarios",
    ],
  },
  {
    label: "Tutor",
    badgeVariant: "outline",
    description: "Acceso exclusivo a sus matrículas activas asignadas.",
    access: [
      "Ver y gestionar sus matrículas asignadas (solo activas)",
      "Datos del alumno de cada matrícula (solo lectura)",
      "Registrar y gestionar seguimientos de tutoría",
    ],
    noAccess: [
      "Módulo de Alumnos ni CRM",
      "Matrículas de otros tutores",
      "Gestión de usuarios, cursos o certificados",
    ],
  },
];

export function RolePermissionsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors rounded-lg"
      >
        <span>Descripción de roles y permisos</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {ROLE_INFO.map((role) => (
            <Card key={role.label} className="shadow-none border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Badge variant={role.badgeVariant} className="text-xs">
                    {role.label}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {role.access.length > 0 && (
                  <ul className="space-y-1">
                    {role.access.map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-xs text-foreground">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {role.noAccess.length > 0 && (
                  <ul className="space-y-1 pt-1 border-t border-border/40">
                    {role.noAccess.map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
