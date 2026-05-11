-- Fix privilege-escalation hole on public.users.
-- Previously: three overlapping UPDATE policies let any authenticated user
-- change any row's `role` column (or at minimum their own role).

-- 1. Drop the broken policies.
DROP POLICY IF EXISTS "admin can update users" ON public.users;
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
DROP POLICY IF EXISTS "Users can update own user row" ON public.users;
DROP POLICY IF EXISTS "Allow admin read users" ON public.users;
-- Also drop policies from any previous run of this migration.
DROP POLICY IF EXISTS "users_update_self_safe" ON public.users;
DROP POLICY IF EXISTS "users_admin_update_any" ON public.users;
DROP POLICY IF EXISTS "users_admin_read_any" ON public.users;

-- 2. SECURITY DEFINER helper — queries users bypassing RLS so policies on
--    public.users can check the caller's role without infinite recursion.
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.users WHERE user_id = auth.uid();
$$;

-- 3. Users can update their own row, but NOT their role or is_active.
CREATE POLICY "users_update_self_safe"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Admins can update any row (including role).
--    Uses the SECURITY DEFINER helper to avoid infinite recursion.
CREATE POLICY "users_admin_update_any"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.get_auth_user_role() = 'admin')
  WITH CHECK (public.get_auth_user_role() = 'admin');

-- 5. Admins can read any row.
CREATE POLICY "users_admin_read_any"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.get_auth_user_role() = 'admin');

-- 6. Defense-in-depth trigger: blocks privileged column changes from non-admins
--    even if a future policy is accidentally too permissive.
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  caller_role := public.get_auth_user_role();

  IF caller_role IS DISTINCT FROM 'admin' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'permission denied: cannot change role';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'permission denied: cannot change is_active';
    END IF;
    IF NEW.account_locked_until IS DISTINCT FROM OLD.account_locked_until THEN
      RAISE EXCEPTION 'permission denied: cannot change account_locked_until';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_privilege_escalation ON public.users;
CREATE TRIGGER prevent_self_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_escalation();
