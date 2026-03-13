-- Create managers profile table
CREATE TABLE IF NOT EXISTS public.managers (
  manager_id   uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id      uuid NOT NULL UNIQUE REFERENCES public.users(user_id) ON DELETE CASCADE,
  first_name   varchar,
  last_name    varchar,
  employee_id  varchar UNIQUE,
  created_at   timestamp DEFAULT now()
);

ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view own row"
  ON public.managers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Managers can update own row"
  ON public.managers FOR UPDATE
  USING (user_id = auth.uid());

GRANT ALL ON TABLE public.managers TO anon;
GRANT ALL ON TABLE public.managers TO authenticated;
GRANT ALL ON TABLE public.managers TO service_role;

-- Replace trigger function to read role + profile from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.role;
BEGIN
  v_role := COALESCE(
    (new.raw_user_meta_data->>'role')::public.role,
    'customer'
  );

  INSERT INTO public.users (user_id, email, role, is_active, mfa_enabled, failed_login_attempts, created_at)
  VALUES (new.id, new.email, v_role, true, false, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  IF v_role = 'customer' THEN
    INSERT INTO public.customers (
      user_id, first_name, last_name, phone_number, tax_id,
      country, kyc_status, created_at
    )
    VALUES (
      new.id,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'phone_number',
      new.raw_user_meta_data->>'tax_id',
      'USA', 'pending', now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'manager' THEN
    INSERT INTO public.managers (user_id, first_name, last_name, employee_id, created_at)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'employee_id',
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
