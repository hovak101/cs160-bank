-- Fix two wide-open RLS policies that allowed any authenticated user to
-- update any account balance or any transaction record directly via the anon key.

-- ── accounts ─────────────────────────────────────────────────────────────────
-- "Allow authenticated update accounts" used USING (true) WITH CHECK (true),
-- meaning any logged-in user could zero out every account in the database.
-- The "Customer can update own account" policy (already present) is sufficient:
-- it restricts updates to accounts whose customer_id matches the caller.
DROP POLICY IF EXISTS "Allow authenticated update accounts" ON public.accounts;

-- ── transactions ─────────────────────────────────────────────────────────────
-- "Allow authenticated update transactions" used USING (true) WITH CHECK (true),
-- meaning any logged-in user could overwrite any transaction's amount or status.
-- Replace it with a policy scoped to transactions linked to the caller's accounts.
-- This preserves the ATM complete/cancel flow (which updates pending transactions
-- for the customer's own account via the user-level client).
DROP POLICY IF EXISTS "Allow authenticated update transactions" ON public.transactions;

CREATE POLICY "customers_update_own_transactions"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (
    source_account_id IN (
      SELECT a.account_id
      FROM public.accounts a
      JOIN public.customers c ON c.customer_id = a.customer_id
      WHERE c.user_id = auth.uid()
    )
    OR
    destination_account_id IN (
      SELECT a.account_id
      FROM public.accounts a
      JOIN public.customers c ON c.customer_id = a.customer_id
      WHERE c.user_id = auth.uid()
    )
  );
