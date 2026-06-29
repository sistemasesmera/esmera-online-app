/**
 * Puerto para requisitos de formato/exportación (FUNDAE, Certificados de
 * Profesionalidad) — no son APIs en vivo sino generación de ficheros en el
 * formato exigido por el organismo correspondiente. Sin adapter todavía.
 */
export interface ExportProviderPort {
  generateExport(input: { enrollmentIds: string[] }): Promise<{ fileUrl: string }>;
}
