# Bug Fix Report — cs160-bank

## Bug 1: Transactions Filter Decimals

**File changed:** `components/admin/transaction-filters.tsx`

**What the fix does:**
- Changed the Maximum Amount `onChange` handler from `setMaxAmount(Math.max(parseFloat(e.target.value) || 0, 0).toString())` to `setMaxAmount(e.target.value)`. The old handler eagerly parsed the raw string with `parseFloat(...) || 0`, which coerces intermediate strings like `"0."` to `0` and triggers a re-render that resets the controlled `<input>`, stripping the decimal. Storing the raw string avoids this — `parseFloat` is deferred to `handleApplyFilters` where it already lived.
- Added `step="0.01"` to both min and max amount inputs so the browser's built-in spinner increments in cent steps, and replaced the `|| minAmountThreshold` fallback in the min-amount handler with a `Number.isFinite` guard (same intent, doesn't corrupt non-numeric intermediates).

**Why it won't break existing behavior:**
`handleApplyFilters` already called `parseFloat(maxAmount as string)` — it always treated `maxAmount` as a parseable string, so storing a raw string changes nothing at apply-time. The `minAmount` change is logically identical to the original; it only avoids treating `NaN` as `0` when `minAmountThreshold` is also `0`.

---

## Bug 2: Text Field Spillover

**File changed:** `components/manager/dashboard-stats.tsx`

**What the fix does:**
Added overflow containment to all cards that display large currency values:
- `StatCard`: inner `<div>` gets `min-w-0 flex-1`; the icon wrapper gets `shrink-0`; the value `<h3>` gets `truncate` + `title={value}` (full value visible on hover).
- `InsightCard`: same treatment for `<h4>`.
- Inline Transaction Volume card: same treatment for the headline `<h3>`.
- Deposit / Withdrawal sub-rows: label `<span>` gets `shrink-0`; value `<span>` gets `truncate` + `title=...`.

**Why it won't break existing behavior:**
Pure CSS additions. Layout and data rendering are unchanged; the `title` attribute surfaces the full value when text is clipped.

---

## Bug 3: Floating Point Validation — Bill Payments

**Files changed:**
- `app/api/bill-payments/route.ts`
- `app/api/customer/atm/route.ts`
- `app/api/customer/deposit-cheque/route.ts`

**What the fix does:**
Adds `/^\d+(\.\d{1,2})?$/` regex validation **before** numeric conversion in all three endpoints:
- **bill-payments**: applied as `String(amount)` on the JSON-parsed value, inserted after the `> 0` guard and before `validateMoneyAmount(Number(amount))`.
- **ATM**: applied as `String(body.amount ?? "")` before `Number(body.amount)`, so the raw value is checked while it still carries full string precision.
- **deposit-cheque**: the amount already arrives as a FormData string; a `rawAmount` variable is captured and checked, then passed to `Number()`.

Values like `0.90000000001` stringify to `"0.90000000001"` which fails the regex; legitimate inputs like `0.9` stringify to `"0.9"` which passes. JSON `1.0` stringifies to `"1"` which also passes.

**Why it won't break existing behavior:**
Any amount that was previously valid (positive, ≤ max, at most 2 decimal places) still passes. The regex rejects only inputs the application should never have accepted.

---

## Bug 4: Exposed Supabase Keys / Insufficient RLS

**Files changed:**
- `supabase/migrations/20260511000000_fix_rls_accounts_transactions.sql` (new)
- `supabase/migrations/20260504000000_fix_users_role_escalation.sql` (already existed, untracked — must be applied)

**Root cause:**
The `NEXT_PUBLIC_*` prefix intentionally bundles values into the browser JS bundle — that is how Next.js works and cannot be changed. The anon key is by design a public credential. The actual vulnerability was that the Supabase database had **two wide-open RLS UPDATE policies** that allowed any authenticated user to mutate any row in the database using just the anon key:

- `"Allow authenticated update accounts"` on `public.accounts` — `USING (true) WITH CHECK (true)`: any logged-in user could zero every account balance.
- `"Allow authenticated update transactions"` on `public.transactions` — `USING (true) WITH CHECK (true)`: any logged-in user could overwrite any transaction amount or status.
- Three overlapping UPDATE policies on `public.users` (including `"admin can update users"` with `USING (true)`) allowed any user to set their own `role` to `"admin"`.

**What the fix does:**

*`20260511000000_fix_rls_accounts_transactions.sql`*
- Drops `"Allow authenticated update accounts"`. The existing `"Customer can update own account"` policy (already present) is sufficient — it limits updates to accounts owned by the caller. Internal transfers are always between the same customer's own accounts (verified in the route), so no functionality breaks.
- Drops `"Allow authenticated update transactions"`. Adds `"customers_update_own_transactions"` which allows UPDATE only on transactions where `source_account_id` or `destination_account_id` belongs to an account owned by the authenticated user. This preserves the ATM complete/cancel flow.

*`20260504000000_fix_users_role_escalation.sql`*
- Drops the three broken UPDATE policies on `public.users`.
- Adds `"users_update_self_safe"` (own row only) and `"users_admin_update_any"` (admin only).
- Adds a `prevent_self_privilege_escalation` trigger as defense-in-depth: even if a future policy is too permissive, non-admins cannot change `role`, `is_active`, or `account_locked_until`.

**Why it won't break existing behavior:**
- Customer account updates (deposits, withdrawals, ATM, internal transfers) all operate on accounts owned by the authenticated customer — covered by the existing `"Customer can update own account"` policy.
- ATM complete/cancel updates only the transaction linked to the customer's own account — covered by the new narrow `"customers_update_own_transactions"` policy.
- Admin/manager routes that update other customers' data already use `supabaseAdmin` (service role key, bypasses RLS by design).

**To apply:** These migrations must be run against the database. For the self-hosted Docker stack, restart with `docker compose up -d` — Supabase applies new migration files automatically on startup. For the cloud project, run via the Supabase CLI or the SQL editor in the dashboard.

---

## Bug 5: Improper Manager API Restrictions

**File changed:** `app/api/admin/managers/add/route.ts`

**What the fix does:**
Changed `requireRole(["admin", "manager"])` to `requireRole(["admin"])` on line 22. `requireRole` queries the `users` table for the caller's role and returns a 403 if it is not in the allowed list. With the old list, any authenticated manager could invoke this endpoint and create new manager accounts.

**Why it won't break existing behavior:**
The only callers of this endpoint in the UI are the admin add-manager form (`components/admin/add-manager-form.tsx`), which is already behind the admin layout guard. Legitimate admin users are unaffected. Managers who previously could call this endpoint will now receive 403 — which is the intended behavior.

---

## Bug 6: Salami Attack on Credit Card API

**File changed:** `app/api/customer/credit-cards/purchase/route.ts`

**What the fix does:**
Two additions before the existing `validateMoneyAmount` call:
1. **Decimal-place regex** — `/^\d+(\.\d{1,2})?$/` is applied to `String(body.amount ?? "")` before `Number()` conversion. This rejects `0.001`, `0.005`, etc.
2. **Minimum amount guard** — the existing `amount <= 0` guard is changed to `amount < 0.01`, so amounts that are positive but round to `$0.00` (e.g. `0.001`) are also rejected by this path.

Both checks fire before any database writes or credit account updates.

**Why it won't break existing behavior:**
Legitimate purchases are at least `$0.01` and at most 2 decimal places. The regex passes `"1"`, `"0.5"`, `"99.99"` and rejects only inputs with more than 2 decimal places. The `< 0.01` change tightens the existing `<= 0` check by one cent; no valid real-world purchase amount is between `$0.00` and `$0.01`.
