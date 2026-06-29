/**
 * Puerto para plataformas de formación externas (Moodle, EvolCampus).
 * El dominio depende únicamente de esta interfaz; los adapters concretos
 * se implementarán en el módulo de integraciones (fuera del alcance actual).
 */
export interface LmsProviderPort {
  createUserAccount(input: { email: string; fullName: string }): Promise<{ externalUserId: string }>;
  enrollUserInCourse(input: { externalUserId: string; externalCourseId: string }): Promise<void>;
  getCourseProgress(input: {
    externalUserId: string;
    externalCourseId: string;
  }): Promise<{ progressPercent: number }>;
}
