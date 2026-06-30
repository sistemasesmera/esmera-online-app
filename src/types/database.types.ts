// Tipos de la base de datos Supabase, escritos a mano para que coincidan con
// supabase/migrations/0001_initial_schema.sql. Cuando el proyecto se enlace
// con la CLI de Supabase, regenerar con:
//   npx supabase gen types typescript --linked > src/types/database.types.ts
// Se amplía tabla por tabla a medida que cada módulo añade su repositorio.

export type AppRole = "tech" | "jefe_comercial" | "comercial" | "administracion" | "tutor";
export type StudentStatus = "en_formacion" | "expediente_cerrado";
export type EnrollmentStatus = "pendiente" | "validada" | "activa" | "finalizada" | "cancelada";
export type LeadStatus = "nuevo" | "contactado" | "cualificado" | "convertido" | "descartado";
export type LeadSource = "web" | "meta_ads" | "organico";
export type ContractStatus = "borrador" | "enviado" | "firmado" | "anulado";
export type PaymentType = "contado" | "financiado" | "mixto";
export type CashMethod = "transferencia" | "efectivo";
export type Financer = "alma" | "sabadell" | "sequra" | "esmera";
export type ContactType = "correo" | "llamada" | "videollamada" | "whatsapp" | "otro";
export type FollowupStudentStatus = "activo" | "pendiente" | "sin_actividad" | "riesgo_abandono" | "finalizado";
export type CertificateStatus = "pendiente" | "emitido" | "anulado";
export type NotificationType =
  | "nueva_venta"
  | "matricula_pendiente"
  | "tutor_asignado"
  | "alumno_inactivo"
  | "curso_finalizado"
  | "certificado_pendiente";
export type LeadContactType = "llamada_saliente" | "llamada_entrante" | "email" | "whatsapp" | "reunion" | "otro";

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          user_name: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          entity_name: string | null;
          description: string;
          metadata: Record<string, unknown>;
          lead_id: string | null;
          student_id: string | null;
          enrollment_id: string | null;
        };
        Insert: {
          user_id?: string | null;
          user_name?: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          entity_name?: string | null;
          description: string;
          metadata?: Record<string, unknown>;
          lead_id?: string | null;
          student_id?: string | null;
          enrollment_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["activity_logs"]["Insert"]>;
        Relationships: [];
      };
      student_attachments: {
        Row: {
          id: string;
          student_id: string | null;
          lead_id: string | null;
          certificate_id: string | null;
          enrollment_id: string | null;
          file_name: string;
          file_path: string;
          file_size: number | null;
          mime_type: string | null;
          uploaded_by: string;
          created_at: string;
          title: string | null;
        };
        Insert: {
          student_id?: string | null;
          lead_id?: string | null;
          certificate_id?: string | null;
          enrollment_id?: string | null;
          file_name: string;
          file_path: string;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_by: string;
          title?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["student_attachments"]["Insert"]>;
        Relationships: [];
      };
      lead_interactions: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string;
          contact_type: LeadContactType;
          notes: string;
          followup_date: string;
          next_followup_date: string | null;
          created_at: string;
        };
        Insert: {
          lead_id: string;
          user_id: string;
          contact_type: LeadContactType;
          notes: string;
          followup_date?: string;
          next_followup_date?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["lead_interactions"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          related_entity_type: string | null;
          related_entity_id: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          is_read?: boolean;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          id: string;
          enrollment_id: string;
          status: CertificateStatus;
          document_url: string | null;
          issued_at: string | null;
          issued_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          enrollment_id: string;
          status?: CertificateStatus;
          document_url?: string | null;
        };
        Update: {
          status?: CertificateStatus;
          document_url?: string | null;
          issued_at?: string | null;
          issued_by?: string | null;
        };
        Relationships: [];
      };
      contract_events: {
        Row: {
          id: string;
          contract_id: string;
          enrollment_id: string | null;
          event_type: string;
          occurred_at: string;
          email: string | null;
          decline_reason: string | null;
        };
        Insert: {
          contract_id: string;
          enrollment_id?: string | null;
          event_type: string;
          occurred_at?: string;
          email?: string | null;
          decline_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["contract_events"]["Insert"]>;
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          enrollment_id: string | null;
          opportunity_id: string | null;
          student_id: string | null;
          status: ContractStatus;
          amount: number;
          payment_type: PaymentType | null;
          cash_method: CashMethod | null;
          cash_amount: number | null;
          financer: Financer | null;
          financed_amount: number | null;
          document_url: string | null;
          signed_at: string | null;
          sent_at: string | null;
          docuseal_submission_id: string | null;
          docuseal_signing_url: string | null;
          declined_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          enrollment_id?: string | null;
          opportunity_id?: string | null;
          student_id?: string | null;
          status?: ContractStatus;
          amount: number;
          payment_type?: PaymentType | null;
          cash_method?: CashMethod | null;
          cash_amount?: number | null;
          financer?: Financer | null;
          financed_amount?: number | null;
          document_url?: string | null;
          created_by: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["contracts"]["Insert"], "created_by">> & {
          signed_at?: string | null;
          sent_at?: string | null;
          docuseal_submission_id?: string | null;
          docuseal_signing_url?: string | null;
          declined_at?: string | null;
          status?: ContractStatus;
          document_url?: string | null;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          description: string | null;
          duration_hours: number | null;
          is_fundae: boolean;
          is_certificado_profesionalidad: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          code?: string | null;
          description?: string | null;
          duration_hours?: number | null;
          is_fundae?: boolean;
          is_certificado_profesionalidad?: boolean;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          source: LeadSource;
          status: LeadStatus;
          interested_course: string | null;
          notes: string | null;
          owner_id: string | null;
          converted_to_student_id: string | null;
          dni_nie: string | null;
          address: string | null;
          province: string | null;
          postal_code: string | null;
          birth_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          full_name: string;
          email?: string | null;
          phone?: string | null;
          source?: LeadSource;
          status?: LeadStatus;
          interested_course?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          dni_nie?: string | null;
          address?: string | null;
          province?: string | null;
          postal_code?: string | null;
          birth_date?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]> & {
          converted_to_student_id?: string | null;
        };
        Relationships: [];
      };
      opportunities: {
        Row: {
          id: string;
          lead_id: string;
          stage_id: string;
          course_id: string | null;
          estimated_amount: number | null;
          owner_id: string;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          lead_id: string;
          stage_id: string;
          course_id?: string | null;
          estimated_amount?: number | null;
          owner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["opportunities"]["Insert"]>;
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          enrollment_number: number;
          student_id: string;
          course_id: string;
          platform_id: string | null;
          tutor_id: string | null;
          status: EnrollmentStatus;
          enrollment_date: string;
          start_date: string | null;
          end_date: string | null;
          duration_months: number | null;
          notes: string | null;
          validated_by: string | null;
          validated_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          student_id: string;
          course_id: string;
          platform_id?: string | null;
          tutor_id?: string | null;
          status?: EnrollmentStatus;
          enrollment_date: string;
          start_date?: string | null;
          end_date?: string | null;
          duration_months?: number | null;
          notes?: string | null;
          created_by: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["enrollments"]["Insert"], "student_id" | "created_by">> & {
          validated_by?: string | null;
          validated_at?: string | null;
        };
        Relationships: [];
      };
      platforms: {
        Row: {
          id: string;
          code: string;
          name: string;
          is_active: boolean;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          is_active?: boolean;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["platforms"]["Insert"], "code">>;
        Relationships: [];
      };
      pipeline_stages: {
        Row: {
          id: string;
          code: string;
          name: string;
          display_order: number;
          is_won: boolean;
          is_lost: boolean;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          display_order: number;
          is_won?: boolean;
          is_lost?: boolean;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["pipeline_stages"]["Insert"], "code">>;
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          student_number: number;
          full_name: string;
          first_name: string;
          last_name: string;
          dni_nie: string;
          email: string;
          phone: string | null;
          address: string | null;
          province: string | null;
          postal_code: string | null;
          birth_date: string | null;
          status: StudentStatus;
          lead_id: string | null;
          assigned_to: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          full_name: string;
          first_name: string;
          last_name: string;
          dni_nie: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          province?: string | null;
          postal_code?: string | null;
          birth_date?: string | null;
          status?: StudentStatus;
          lead_id?: string | null;
          assigned_to?: string | null;
          created_by: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["students"]["Insert"], "created_by">>;
        Relationships: [];
      };
      tutors: {
        Row: {
          id: string;
          user_id: string;
          specialty: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          specialty?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["tutors"]["Insert"]>;
        Relationships: [];
      };
      tutor_followups: {
        Row: {
          id: string;
          enrollment_id: string;
          tutor_id: string;
          contact_type: ContactType;
          student_status_snapshot: FollowupStudentStatus;
          notes: string;
          followup_date: string;
          created_at: string;
        };
        Insert: {
          enrollment_id: string;
          tutor_id: string;
          contact_type: ContactType;
          student_status_snapshot: FollowupStudentStatus;
          notes: string;
          followup_date?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tutor_followups"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: AppRole;
          phone: string | null;
          is_active: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role: AppRole;
          phone?: string | null;
          is_active?: boolean;
          avatar_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          code: AppRole;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          code: AppRole;
          name: string;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      student_status: StudentStatus; // simplified to en_formacion | expediente_cerrado
      enrollment_status: EnrollmentStatus;
      lead_status: LeadStatus;
      lead_source: LeadSource;
      contract_status: ContractStatus;
      contact_type: ContactType;
      followup_student_status: FollowupStudentStatus;
      certificate_status: CertificateStatus;
      notification_type: NotificationType;
    };
  };
};
