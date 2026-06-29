-- Fix: infinite recursion between students_select ↔ enrollments_select.
-- The original enrollments_select for 'comercial' queried students,
-- and students_select queried enrollments → cycle.
-- Fix: give comercial full read access to enrollments (no students sub-query).

drop policy if exists enrollments_select on public.enrollments;

create policy enrollments_select on public.enrollments for select using (
  public.current_user_role() in ('administrador', 'administracion', 'direccion', 'comercial')
  or (public.current_user_role() = 'tutor' and tutor_id = public.tutor_id_for_current_user())
);
