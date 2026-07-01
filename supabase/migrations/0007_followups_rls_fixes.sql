-- Allow comercial role to read tutor_followups
DROP POLICY IF EXISTS "followups_select" ON public.tutor_followups;

CREATE POLICY "followups_select"
ON public.tutor_followups
FOR SELECT
TO public
USING (
  current_user_role() = ANY (ARRAY[
    'tech'::app_role,
    'administracion'::app_role,
    'jefe_comercial'::app_role,
    'comercial'::app_role
  ])
  OR (
    current_user_role() = 'tutor'::app_role
    AND tutor_id = tutor_id_for_current_user()
  )
);

-- Allow admins and followup owners to delete tutor_followups
CREATE POLICY IF NOT EXISTS "followups_delete"
ON public.tutor_followups
FOR DELETE
TO public
USING (
  is_admin()
  OR (
    current_user_role() = 'tutor'::app_role
    AND tutor_id = tutor_id_for_current_user()
  )
);
