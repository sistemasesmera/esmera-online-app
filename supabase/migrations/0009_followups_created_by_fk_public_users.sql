-- Change created_by FK from auth.users to public.users so PostgREST can resolve the join
ALTER TABLE public.tutor_followups
  DROP CONSTRAINT IF EXISTS tutor_followups_created_by_fkey;

ALTER TABLE public.tutor_followups
  ADD CONSTRAINT tutor_followups_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id);
