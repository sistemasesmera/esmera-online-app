-- Complete fix for RLS infinite recursion between students ↔ enrollments.
--
-- Root cause:
--   students_select  → EXISTS on enrollments (triggers enrollments_select)
--   enrollments_select → EXISTS on students  (triggers students_select) → cycle
--
-- Fix A: wrap the enrollments look-up inside a SECURITY DEFINER function so
--        it bypasses enrollments RLS and never re-enters students_select.
-- Fix B: simplify enrollments_select so comercial sees all enrollments
--        without querying students at all.

-- ── Fix A: helper function (security definer = bypasses RLS) ──────────────
create or replace function public.tutor_can_see_student(p_student_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.enrollments
    where student_id = p_student_id
      and tutor_id = (select id from public.tutors where user_id = auth.uid())
  );
$$;

-- ── Fix A: replace students_select to use the helper ─────────────────────
drop policy if exists students_select on public.students;

create policy students_select on public.students for select using (
  public.current_user_role() in ('administrador', 'administracion', 'direccion')
  or (
    public.current_user_role() = 'tutor'
    and public.tutor_can_see_student(id)
  )
);

-- ── Fix B: replace enrollments_select without students sub-query ──────────
drop policy if exists enrollments_select on public.enrollments;

create policy enrollments_select on public.enrollments for select using (
  public.current_user_role() in ('administrador', 'administracion', 'direccion', 'comercial')
  or (public.current_user_role() = 'tutor' and tutor_id = public.tutor_id_for_current_user())
);
