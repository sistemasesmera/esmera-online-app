-- Stripe webhook support
-- Adds pendiente_validar status, source/stripe_session_id columns,
-- and makes created_by/dni_nie nullable for system-generated records.

-- 1. New enrollment status for web purchases awaiting admin contact
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'pendiente_validar';

-- 2. Identify where the enrollment came from (e.g. 'web_checkout', null = internal)
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS source text;

-- 3. Stripe Checkout Session ID — used for idempotency and traceability
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS stripe_session_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_stripe_session
  ON public.enrollments(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- 4. Webhook creates records without an authenticated user — allow null
ALTER TABLE public.enrollments ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN created_by DROP NOT NULL;

-- 5. DNI is collected later by administration after web purchase
ALTER TABLE public.students ALTER COLUMN dni_nie DROP NOT NULL;
