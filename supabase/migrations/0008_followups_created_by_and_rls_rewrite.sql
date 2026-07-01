-- Make tutor_id nullable (comerciales don't have a tutors record)
ALTER TABLE public.tutor_followups
  ALTER COLUMN tutor_id DROP NOT NULL;

-- Add created_by to track ownership per followup
ALTER TABLE public.tutor_followups
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Backfill existing rows from tutors.user_id
UPDATE public.tutor_followups tf
SET created_by = t.user_id
FROM public.tutors t
WHERE tf.tutor_id = t.id
  AND tf.created_by IS NULL;

-- INSERT: any recordFollowup role can insert
-- Tutors are restricted to their own enrollment; others are unrestricted at DB level (app enforces)
DROP POLICY IF EXISTS "followups_insert" ON public.tutor_followups;
CREATE POLICY "followups_insert"
ON public.tutor_followups FOR INSERT TO public
WITH CHECK (
  current_user_role() = ANY (ARRAY[
    'tech'::app_role, 'administracion'::app_role, 'jefe_comercial'::app_role, 'comercial'::app_role
  ])
  OR (
    current_user_role() = 'tutor'::app_role
    AND tutor_id = tutor_id_for_current_user()
  )
);

-- UPDATE: super-admins (tech/administracion/jefe_comercial) can edit any; others only their own
DROP POLICY IF EXISTS "followups_update" ON public.tutor_followups;
CREATE POLICY "followups_update"
ON public.tutor_followups FOR UPDATE TO public
USING (
  current_user_role() = ANY (ARRAY['tech'::app_role, 'administracion'::app_role, 'jefe_comercial'::app_role])
  OR created_by = auth.uid()
)
WITH CHECK (
  current_user_role() = ANY (ARRAY['tech'::app_role, 'administracion'::app_role, 'jefe_comercial'::app_role])
  OR created_by = auth.uid()
);

-- DELETE: same rules as UPDATE
DROP POLICY IF EXISTS "followups_delete" ON public.tutor_followups;
CREATE POLICY "followups_delete"
ON public.tutor_followups FOR DELETE TO public
USING (
  current_user_role() = ANY (ARRAY['tech'::app_role, 'administracion'::app_role, 'jefe_comercial'::app_role])
  OR created_by = auth.uid()
);
