export type FundaeReportParams = {
  courseId: string;
  platformId: string;
  year: number;
  period: number;
};

export type CertificadoProfesionalidadParams = {
  studentId: string;
  courseId: string;
  completionDate: string;
};

export interface ExportProviderPort {
  exportFundaeReport(params: FundaeReportParams): Promise<Blob>;
  exportCertificadoProfesionalidad(params: CertificadoProfesionalidadParams): Promise<Blob>;
}
