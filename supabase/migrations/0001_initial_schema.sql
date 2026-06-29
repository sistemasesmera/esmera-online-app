-- Esmera Online Manager — esquema inicial
-- Orden de creación respeta dependencias de FK; la única excepción es
-- leads.converted_to_student_id, que se añade al final por la referencia
-- circular leads <-> students.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===================== Roles y usuarios =====================

create type app_role as enum ('administrador','comercial','administracion','tutor','direccion');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code app_role not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role app_role not null,
  phone text,
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_users_role on public.users(role);
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ===================== Catálogos =====================

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  display_order int not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  description text,
  duration_hours int,
  is_fundae boolean not null default false,
  is_certificado_profesionalidad boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

-- ===================== CRM comercial =====================

create type lead_status as enum ('nuevo','contactado','cualificado','convertido','descartado');
create type lead_source as enum ('web','referido','redes_sociales','llamada_entrante','evento','otro');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  source lead_source not null default 'otro',
  status lead_status not null default 'nuevo',
  interested_course_id uuid references public.courses(id),
  notes text,
  owner_id uuid not null references public.users(id),
  converted_to_student_id uuid, -- FK añadida al final (ver 0001 sección final)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_leads_status on public.leads(status);
create index idx_leads_owner on public.leads(owner_id);
create trigger trg_leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages(id),
  course_id uuid references public.courses(id),
  estimated_amount numeric(10,2),
  owner_id uuid not null references public.users(id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_opportunities_stage on public.opportunities(stage_id);
create index idx_opportunities_owner on public.opportunities(owner_id);
create trigger trg_opportunities_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();

-- ===================== Alumnos =====================

create type student_status as enum (
  'en_formacion','seguimiento_activo','riesgo_abandono',
  'sin_actividad','finalizado','expediente_cerrado'
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  first_name text not null,
  last_name text not null,
  dni_nie text not null,
  email text not null,
  phone text,
  address text,
  status student_status not null default 'en_formacion',
  lead_id uuid references public.leads(id),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index idx_students_dni on public.students(dni_nie) where deleted_at is null;
create index idx_students_status on public.students(status);
create trigger trg_students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

alter table public.leads add constraint fk_leads_converted_student
  foreign key (converted_to_student_id) references public.students(id);

create table public.tutors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) unique,
  specialty text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===================== Matrículas =====================

create type enrollment_status as enum ('pendiente','validada','activa','finalizada','cancelada');

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  course_id uuid not null references public.courses(id),
  platform_id uuid references public.platforms(id),
  tutor_id uuid references public.tutors(id),
  status enrollment_status not null default 'pendiente',
  enrollment_date date not null default current_date,
  start_date date,
  end_date date,
  notes text,
  validated_by uuid references public.users(id),
  validated_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_tutor on public.enrollments(tutor_id);
create index idx_enrollments_status on public.enrollments(status);
create index idx_enrollments_course on public.enrollments(course_id);
create trigger trg_enrollments_updated_at before update on public.enrollments
  for each row execute function public.set_updated_at();

-- ===================== Contratos =====================

create type contract_status as enum ('borrador','enviado','firmado','anulado');

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id),
  student_id uuid references public.students(id),
  status contract_status not null default 'borrador',
  amount numeric(10,2) not null,
  document_url text,
  signed_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

-- ===================== Seguimiento de tutores =====================

create type contact_type as enum ('correo','llamada','videollamada','whatsapp','otro');
create type followup_student_status as enum ('activo','pendiente','sin_actividad','riesgo_abandono','finalizado');

create table public.tutor_followups (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id),
  tutor_id uuid not null references public.tutors(id),
  contact_type contact_type not null,
  student_status_snapshot followup_student_status not null,
  notes text not null,
  followup_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_followups_enrollment on public.tutor_followups(enrollment_id);
create index idx_followups_tutor on public.tutor_followups(tutor_id);

-- Sincroniza students.status con el último seguimiento registrado (regla explícita, ver diseño)
create or replace function public.sync_student_status_from_followup()
returns trigger language plpgsql as $$
declare
  v_student_id uuid;
  v_new_status student_status;
begin
  select e.student_id into v_student_id
  from public.enrollments e where e.id = new.enrollment_id;

  v_new_status := case new.student_status_snapshot
    when 'activo' then 'seguimiento_activo'
    when 'pendiente' then 'seguimiento_activo'
    when 'sin_actividad' then 'sin_actividad'
    when 'riesgo_abandono' then 'riesgo_abandono'
    when 'finalizado' then 'finalizado'
  end;

  update public.students set status = v_new_status where id = v_student_id;
  return new;
end;
$$;

create trigger trg_sync_student_status after insert on public.tutor_followups
  for each row execute function public.sync_student_status_from_followup();

-- ===================== Certificados =====================

create type certificate_status as enum ('pendiente','emitido','anulado');

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id),
  status certificate_status not null default 'pendiente',
  document_url text,
  issued_at timestamptz,
  issued_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_certificates_enrollment on public.certificates(enrollment_id);
create trigger trg_certificates_updated_at before update on public.certificates
  for each row execute function public.set_updated_at();

-- ===================== Notificaciones y auditoría =====================

create type notification_type as enum (
  'nueva_venta','matricula_pendiente','tutor_asignado',
  'alumno_inactivo','curso_finalizado','certificado_pendiente'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  type notification_type not null,
  title text not null,
  message text not null,
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_unread on public.notifications(user_id, is_read);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  changed_by uuid references public.users(id),
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_table_record on public.audit_logs(table_name, record_id);
create index idx_audit_changed_by on public.audit_logs(changed_by);
create index idx_audit_created_at on public.audit_logs(created_at desc);
