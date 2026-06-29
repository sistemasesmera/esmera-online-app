export const APP_ROLES = [
  "tech",
  "jefe_comercial",
  "comercial",
  "administracion",
  "tutor",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  tech: "Tech",
  jefe_comercial: "Jefe Comercial",
  comercial: "Comercial",
  administracion: "Administración",
  tutor: "Tutor",
};

/**
 * Mapa de capacidades por rol, fuente de verdad compartida por la
 * navegación (cosmética) y por los guards de Server Actions (reales).
 * Las políticas RLS en Postgres son la barrera final e independiente.
 */
export const CAPABILITIES = {
  // Sistema
  manageUsers: ["tech"],
  manageCatalogs: ["tech"],

  // Cursos
  manageCourses: ["tech", "administracion"],

  // CRM Leads — comercial solo ve/gestiona los suyos; jefe_comercial ve todos
  manageLeads: ["tech", "jefe_comercial", "comercial"],
  viewAllLeads: ["tech", "jefe_comercial"],
  convertLead: ["tech", "jefe_comercial", "comercial"],
  assignLeads: ["tech", "jefe_comercial"],

  // Alumnos — administración gestiona; comercial ve los suyos; jefe_comercial ve todos
  manageStudents: ["tech", "administracion"],
  viewStudents: ["tech", "administracion", "jefe_comercial", "comercial"],

  // Matrículas — administración gestiona; jefe_comercial ve todas; comercial ve las suyas; tutor ve las suyas
  manageEnrollments: ["tech", "administracion"],
  viewEnrollments: ["tech", "administracion", "jefe_comercial", "comercial", "tutor"],
  viewAllEnrollments: ["tech", "administracion", "jefe_comercial"],

  // Contratos
  createContracts: ["tech", "jefe_comercial", "comercial"],
  manageContracts: ["tech", "administracion"],
  signContracts: ["tech", "jefe_comercial", "comercial"],

  // Oportunidades
  manageOpportunities: ["tech", "jefe_comercial", "comercial"],

  // Tutoría
  manageFollowups: ["tech", "tutor"],

  // Certificados
  manageCertificates: ["tech", "administracion"],

  // Informes / auditoría — solo administrador
  viewReports: ["tech"],
  viewAuditLogs: ["tech"],
} as const satisfies Record<string, readonly AppRole[]>;

export type Capability = keyof typeof CAPABILITIES;

export function roleHasCapability(role: AppRole, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly AppRole[]).includes(role);
}
