-- Esmera Online Manager — Row Level Security
-- Patrón: enable RLS en toda tabla de negocio; sin política = sin acceso.
-- Las funciones helper son `stable` para que Postgres las cachee dentro de la misma query.

create or replace function public.current_user_role()
returns app_role language sql stable security definer as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.current_user_role() = 'administrador';
$$;

create or replace function public.tutor_id_for_current_user()
returns uuid language sql stable security definer as $$
  select id from public.tutors where user_id = auth.uid();
$$;

-- ===================== users =====================
alter table public.users enable row level security;

create policy users_select on public.users for select using (
  public.current_user_role() in ('administrador','direccion') or id = auth.uid()
);
create policy users_insert_admin on public.users for insert with check (public.is_admin());
create policy users_update on public.users for update using (
  public.is_admin() or id = auth.uid()
) with check (
  public.is_admin() or id = auth.uid()
);
create policy users_delete_admin on public.users for delete using (public.is_admin());

-- ===================== catálogos (roles, platforms, pipeline_stages, courses) =====================
alter table public.roles enable row level security;
create policy roles_select_all on public.roles for select using (true);

alter table public.platforms enable row level security;
create policy platforms_select_all on public.platforms for select using (true);
create policy platforms_write_admin on public.platforms for all using (public.is_admin()) with check (public.is_admin());

alter table public.pipeline_stages enable row level security;
create policy pipeline_stages_select_all on public.pipeline_stages for select using (true);
create policy pipeline_stages_write_admin on public.pipeline_stages for all using (public.is_admin()) with check (public.is_admin());

alter table public.courses enable row level security;
create policy courses_select_all on public.courses for select using (true);
create policy courses_write on public.courses for all using (
  public.current_user_role() in ('administrador','administracion')
) with check (
  public.current_user_role() in ('administrador','administracion')
);

-- ===================== leads =====================
alter table public.leads enable row level security;

create policy leads_select on public.leads for select using (
  public.current_user_role() in ('administrador','administracion','direccion')
  or (public.current_user_role() = 'comercial' and owner_id = auth.uid())
);
create policy leads_insert on public.leads for insert with check (
  public.is_admin() or (public.current_user_role() = 'comercial' and owner_id = auth.uid())
);
create policy leads_update on public.leads for update using (
  public.is_admin() or (public.current_user_role() = 'comercial' and owner_id = auth.uid())
) with check (
  public.is_admin() or (public.current_user_role() = 'comercial' and owner_id = auth.uid())
);
create policy leads_delete_admin on public.leads for delete using (public.is_admin());

-- ===================== opportunities =====================
alter table public.opportunities enable row level security;

create policy opportunities_select on public.opportunities for select using (
  public.current_user_role() in ('administrador','administracion','direccion')
  or (public.current_user_role() = 'comercial' and owner_id = auth.uid())
);
create policy opportunities_insert on public.opportunities for insert with check (
  public.is_admin() or (public.current_user_role() = 'comercial' and owner_id = auth.uid())
);
create policy opportunities_update on public.opportunities for update using (
  public.is_admin() or (public.current_user_role() = 'comercial' and owner_id = auth.uid())
) with check (
  public.is_admin() or (public.current_user_role() = 'comercial' and owner_id = auth.uid())
);
create policy opportunities_delete_admin on public.opportunities for delete using (public.is_admin());

-- ===================== students =====================
alter table public.students enable row level security;

create policy students_select on public.students for select using (
  public.current_user_role() in ('administrador','administracion','direccion')
  or (
    public.current_user_role() = 'tutor'
    and exists (
      select 1 from public.enrollments e
      where e.student_id = students.id and e.tutor_id = public.tutor_id_for_current_user()
    )
  )
);
create policy students_write on public.students for all using (
  public.current_user_role() in ('administrador','administracion')
) with check (
  public.current_user_role() in ('administrador','administracion')
);

-- ===================== tutors =====================
alter table public.tutors enable row level security;

create policy tutors_select on public.tutors for select using (
  public.current_user_role() in ('administrador','administracion','direccion')
  or user_id = auth.uid()
);
create policy tutors_write_admin on public.tutors for all using (public.is_admin()) with check (public.is_admin());

-- ===================== enrollments =====================
alter table public.enrollments enable row level security;

create policy enrollments_select on public.enrollments for select using (
  public.current_user_role() in ('administrador','administracion','direccion')
  or (public.current_user_role() = 'tutor' and tutor_id = public.tutor_id_for_current_user())
  or (
    public.current_user_role() = 'comercial'
    and exists (
      select 1 from public.students s
      where s.id = enrollments.student_id and s.lead_id in (
        select id from public.leads where owner_id = auth.uid()
      )
    )
  )
);
create policy enrollments_write on public.enrollments for all using (
  public.current_user_role() in ('administrador','administracion')
) with check (
  public.current_user_role() in ('administrador','administracion')
);

-- ===================== contracts =====================
alter table public.contracts enable row level security;

create policy contracts_select on public.contracts for select using (
  public.current_user_role() in ('administrador','administracion','direccion')
  or (public.current_user_role() = 'comercial' and created_by = auth.uid())
);
create policy contracts_insert on public.contracts for insert with check (
  public.current_user_role() in ('administrador','administracion','comercial')
);
create policy contracts_update on public.contracts for update using (
  public.current_user_role() in ('administrador','administracion')
) with check (
  public.current_user_role() in ('administrador','administracion')
);
create policy contracts_delete_admin on public.contracts for delete using (public.is_admin());

-- ===================== tutor_followups =====================
alter table public.tutor_followups enable row level security;

create policy followups_select on public.tutor_followups for select using (
  public.current_user_role() in ('administrador','administracion','direccion')
  or (public.current_user_role() = 'tutor' and tutor_id = public.tutor_id_for_current_user())
);
create policy followups_insert on public.tutor_followups for insert with check (
  public.is_admin()
  or (public.current_user_role() = 'tutor' and tutor_id = public.tutor_id_for_current_user())
);
create policy followups_update on public.tutor_followups for update using (
  public.is_admin()
  or (public.current_user_role() = 'tutor' and tutor_id = public.tutor_id_for_current_user())
) with check (
  public.is_admin()
  or (public.current_user_role() = 'tutor' and tutor_id = public.tutor_id_for_current_user())
);

-- ===================== certificates =====================
alter table public.certificates enable row level security;

create policy certificates_select on public.certificates for select using (
  public.current_user_role() in ('administrador','administracion','direccion')
);
create policy certificates_write on public.certificates for all using (
  public.current_user_role() in ('administrador','administracion')
) with check (
  public.current_user_role() in ('administrador','administracion')
);

-- ===================== notifications =====================
alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy notifications_insert_any_authenticated on public.notifications for insert with check (auth.uid() is not null);

-- ===================== audit_logs =====================
alter table public.audit_logs enable row level security;

create policy audit_logs_select on public.audit_logs for select using (
  public.current_user_role() in ('administrador','direccion')
);
