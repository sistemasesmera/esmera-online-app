export type LmsCourse = {
  externalId: string;
  name: string;
  shortName: string;
};

export type EnrollStudentParams = {
  platformStudentId: string;
  platformCourseId: string;
};

export type StudentProgress = {
  completionPercent: number;
  lastAccess: Date | null;
  grades: Array<{ itemName: string; grade: number | null }>;
};

export interface LmsProviderPort {
  getCourseList(): Promise<LmsCourse[]>;
  enrollStudent(params: EnrollStudentParams): Promise<void>;
  unenrollStudent(params: EnrollStudentParams): Promise<void>;
  getStudentProgress(platformStudentId: string, platformCourseId: string): Promise<StudentProgress>;
}
