-- =============================================================================
-- Seed Data for CS160 Bank Local Development
-- =============================================================================
-- Mirrors the backend's user creation flow:
--   1. INSERT into auth.users (fires handle_new_user trigger automatically)
--      → trigger creates public.users + public.customers / public.managers
--      → cashbox trigger creates public.cashboxes for each customer
--   2. UPDATE public.managers with employee_id (matches add/route.ts post-trigger update)
--   3. UPDATE public.customers with full profile (matches onboarding profile/route.ts)
--
-- Password for all users: Password123!
-- =============================================================================

-- Fixed UUIDs for reproducibility
-- Admin:     a0000000-0000-0000-0000-000000000001
-- Manager 1: a0000000-0000-0000-0000-000000000002
-- Manager 2: a0000000-0000-0000-0000-000000000003
-- Customer 1-5: c0000000-0000-0000-0000-00000000000{1-5}

-- -------------------------------------------------------------------------
-- Step 1: Insert auth users (trigger handle_new_user fires on each INSERT)
-- -------------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  -- GoTrue requires these token fields to be empty strings, not NULL
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token
) VALUES
  -- Admin
  (
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@bank.com',
    extensions.crypt('Password123!', extensions.gen_salt('bf')),
    NOW(),
    '{"role": "admin", "first_name": "Admin", "last_name": "User"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(),
    NOW(),
    false,
    '', '', '', '', '', '', '', ''
  ),
  -- Manager 1
  (
    'a0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manager1@bank.com',
    extensions.crypt('Password123!', extensions.gen_salt('bf')),
    NOW(),
    '{"role": "manager", "first_name": "Alice", "last_name": "Johnson"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(),
    NOW(),
    false,
    '', '', '', '', '', '', '', ''
  ),
  -- Manager 2
  (
    'a0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manager2@bank.com',
    extensions.crypt('Password123!', extensions.gen_salt('bf')),
    NOW(),
    '{"role": "manager", "first_name": "Bob", "last_name": "Martinez"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(),
    NOW(),
    false,
    '', '', '', '', '', '', '', ''
  ),
  -- Customer 1
  (
    'c0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'customer1@bank.com',
    extensions.crypt('Password123!', extensions.gen_salt('bf')),
    NOW(),
    '{"role": "customer", "first_name": "Carol", "last_name": "Williams"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(),
    NOW(),
    false,
    '', '', '', '', '', '', '', ''
  ),
  -- Customer 2
  (
    'c0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'customer2@bank.com',
    extensions.crypt('Password123!', extensions.gen_salt('bf')),
    NOW(),
    '{"role": "customer", "first_name": "David", "last_name": "Brown"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(),
    NOW(),
    false,
    '', '', '', '', '', '', '', ''
  ),
  -- Customer 3
  (
    'c0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'customer3@bank.com',
    extensions.crypt('Password123!', extensions.gen_salt('bf')),
    NOW(),
    '{"role": "customer", "first_name": "Emma", "last_name": "Davis"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(),
    NOW(),
    false,
    '', '', '', '', '', '', '', ''
  ),
  -- Customer 4
  (
    'c0000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'customer4@bank.com',
    extensions.crypt('Password123!', extensions.gen_salt('bf')),
    NOW(),
    '{"role": "customer", "first_name": "Frank", "last_name": "Wilson"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(),
    NOW(),
    false,
    '', '', '', '', '', '', '', ''
  ),
  -- Customer 5
  (
    'c0000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'customer5@bank.com',
    extensions.crypt('Password123!', extensions.gen_salt('bf')),
    NOW(),
    '{"role": "customer", "first_name": "Grace", "last_name": "Lee"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(),
    NOW(),
    false,
    '', '', '', '', '', '', '', ''
  );

-- -------------------------------------------------------------------------
-- Step 2: Update managers with employee IDs
-- Mirrors: app/api/admin/managers/add/route.ts (generateUniqueEmployeeId + UPDATE)
-- -------------------------------------------------------------------------
UPDATE public.managers
SET employee_id = '11000001'
WHERE user_id = 'a0000000-0000-0000-0000-000000000002';

UPDATE public.managers
SET employee_id = '11000002'
WHERE user_id = 'a0000000-0000-0000-0000-000000000003';

-- -------------------------------------------------------------------------
-- Step 3: Update customers with full profile data
-- Mirrors: app/api/customer/profile/route.ts (UPDATE customers)
-- -------------------------------------------------------------------------
UPDATE public.customers
SET
  first_name    = 'Carol',
  last_name     = 'Williams',
  phone_number  = '4155550101',
  tax_id        = '123456789',
  country       = 'USA',
  address_line_1 = '123 Main St',
  address_line_2 = NULL,
  city          = 'San Francisco',
  state         = 'CA',
  zip_code      = '94102',
  kyc_status    = 'verified'
WHERE user_id = 'c0000000-0000-0000-0000-000000000001';

UPDATE public.customers
SET
  first_name    = 'David',
  last_name     = 'Brown',
  phone_number  = '4155550102',
  tax_id        = '234567890',
  country       = 'USA',
  address_line_1 = '456 Oak Ave',
  address_line_2 = 'Apt 2B',
  city          = 'Oakland',
  state         = 'CA',
  zip_code      = '94601',
  kyc_status    = 'verified'
WHERE user_id = 'c0000000-0000-0000-0000-000000000002';

UPDATE public.customers
SET
  first_name    = 'Emma',
  last_name     = 'Davis',
  phone_number  = '4085550103',
  tax_id        = '345678901',
  country       = 'USA',
  address_line_1 = '789 Pine Rd',
  address_line_2 = NULL,
  city          = 'San Jose',
  state         = 'CA',
  zip_code      = '95101',
  kyc_status    = 'verified'
WHERE user_id = 'c0000000-0000-0000-0000-000000000003';

UPDATE public.customers
SET
  first_name    = 'Frank',
  last_name     = 'Wilson',
  phone_number  = '6505550104',
  tax_id        = '456789012',
  country       = 'USA',
  address_line_1 = '321 Elm St',
  address_line_2 = 'Suite 100',
  city          = 'Palo Alto',
  state         = 'CA',
  zip_code      = '94301',
  kyc_status    = 'pending'
WHERE user_id = 'c0000000-0000-0000-0000-000000000004';

UPDATE public.customers
SET
  first_name    = 'Grace',
  last_name     = 'Lee',
  phone_number  = '5105550105',
  tax_id        = '567890123',
  country       = 'USA',
  address_line_1 = '654 Maple Blvd',
  address_line_2 = NULL,
  city          = 'Berkeley',
  state         = 'CA',
  zip_code      = '94704',
  kyc_status    = 'pending'
WHERE user_id = 'c0000000-0000-0000-0000-000000000005';

-- =============================================================================
-- Step 4: Financial demo data (accounts, transactions, loans, bills, etc.)
-- =============================================================================
-- Goal: every major feature has at least one row to exercise it.
--   Carol  (customer1, verified)  — full picture: checking + savings + credit
--                                   card, active loan, recurring bill, cheque
--                                   deposit, cashbox balance, transactions.
--   David  (customer2, verified)  — checking + savings, simple transfer flow.
--   Emma   (customer3, verified)  — checking + savings, recurring bill with
--                                   executed payments, pending loan, savings
--                                   monthly activity row.
--   Frank  (customer4, pending)   — no accounts; demonstrates KYC-pending
--                                   state for the manager review queue.
--   Grace  (customer5, pending)   — 1 checking, demonstrates new-account flow.
--
-- account_number values are 10-digit demo numbers; deterministic UUIDs are
-- prefixed `1a000000-…` for accounts, `2b000000-…` for txns, etc.
-- =============================================================================

DO $$
DECLARE
  v_carol_cust uuid;
  v_david_cust uuid;
  v_emma_cust  uuid;
  v_grace_cust uuid;

  -- Account UUIDs (referenced across many tables — keep deterministic).
  v_carol_chk  uuid := '1a000000-0000-0000-0000-00000000c101';
  v_carol_sav  uuid := '1a000000-0000-0000-0000-00000000c102';
  v_carol_cred uuid := '1a000000-0000-0000-0000-00000000c103';
  v_david_chk  uuid := '1a000000-0000-0000-0000-00000000c201';
  v_david_sav  uuid := '1a000000-0000-0000-0000-00000000c202';
  v_emma_chk   uuid := '1a000000-0000-0000-0000-00000000c301';
  v_emma_sav   uuid := '1a000000-0000-0000-0000-00000000c302';
  v_grace_chk  uuid := '1a000000-0000-0000-0000-00000000c501';
BEGIN
  -- Idempotency guard: if Carol's checking already exists, financial data
  -- has already been seeded — skip silently.
  IF EXISTS (SELECT 1 FROM public.accounts WHERE account_id = '1a000000-0000-0000-0000-00000000c101') THEN
    RAISE NOTICE 'Financial demo data already present, skipping.';
    RETURN;
  END IF;

  -- Resolve auto-generated customer_id for each seeded user.
  SELECT customer_id INTO v_carol_cust FROM public.customers WHERE user_id = 'c0000000-0000-0000-0000-000000000001';
  SELECT customer_id INTO v_david_cust FROM public.customers WHERE user_id = 'c0000000-0000-0000-0000-000000000002';
  SELECT customer_id INTO v_emma_cust  FROM public.customers WHERE user_id = 'c0000000-0000-0000-0000-000000000003';
  SELECT customer_id INTO v_grace_cust FROM public.customers WHERE user_id = 'c0000000-0000-0000-0000-000000000005';

  -- ----- Accounts -----
  INSERT INTO public.accounts (account_id, customer_id, account_name, account_number, account_type, balance, currency, status, created_at, updated_at) VALUES
    (v_carol_chk,  v_carol_cust, 'Carol Checking',  '1000000001', 'checking', 4250.75, 'USD', 'active', NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 day'),
    (v_carol_sav,  v_carol_cust, 'Carol Savings',   '1000000002', 'saving',   9106.06, 'USD', 'active', NOW() - INTERVAL '60 days', NOW() - INTERVAL '5 days'),
    (v_carol_cred, v_carol_cust, 'Carol Visa',      '1000000003', 'credit',    487.32, 'USD', 'active', NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days'),
    (v_david_chk,  v_david_cust, 'David Checking',  '1000000004', 'checking', 1825.00, 'USD', 'active', NOW() - INTERVAL '50 days', NOW() - INTERVAL '3 days'),
    (v_david_sav,  v_david_cust, 'David Savings',   '1000000005', 'saving',   3200.00, 'USD', 'active', NOW() - INTERVAL '50 days', NOW() - INTERVAL '7 days'),
    (v_emma_chk,   v_emma_cust,  'Emma Checking',   '1000000006', 'checking', 7500.00, 'USD', 'active', NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day'),
    (v_emma_sav,   v_emma_cust,  'Emma Savings',    '1000000007', 'saving',  25000.00, 'USD', 'active', NOW() - INTERVAL '90 days', NOW() - INTERVAL '4 days'),
    (v_grace_chk,  v_grace_cust, 'Grace Checking',  '1000000008', 'checking',  500.00, 'USD', 'active', NOW() - INTERVAL '7 days',  NOW() - INTERVAL '1 day');

  -- ----- Credit account + card (Carol) -----
  INSERT INTO public.credit_accounts (
    account_id, credit_limit, current_balance, statement_balance, minimum_payment_due,
    apr, purchase_apr, cash_advance_apr, cash_advance_limit, cash_advance_balance,
    late_fee_amount, rewards_points,
    last_statement_at, next_statement_at, payment_due_at, last_payment_at,
    created_at, updated_at
  ) VALUES (
    v_carol_cred, 5000.00, 487.32, 487.32, 25.00,
    24.99, 24.99, 29.99, 1500.00, 0.00,
    35.00, 17.50,
    NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', NOW() + INTERVAL '20 days', NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days'
  );

  INSERT INTO public.credit_cards (
    card_id, account_id, cardholder_name, card_brand, card_last4, card_status,
    rewards_program, rewards_rate, exp_month, exp_year,
    created_at, updated_at
  ) VALUES (
    '3c000000-0000-0000-0000-00000000c101', v_carol_cred, 'Carol Williams', 'Visa', '4271', 'active',
    'Cash Back', 0.0150, 8, 2030,
    NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'
  );

  -- ----- Cashboxes (rows already created by trigger; just top one up) -----
  UPDATE public.cashboxes SET balance = 50.00, updated_at = NOW() - INTERVAL '4 days'
    WHERE customer_id = v_carol_cust;
  UPDATE public.cashboxes SET balance = 20.00, updated_at = NOW() - INTERVAL '10 days'
    WHERE customer_id = v_emma_cust;

  -- ----- Transactions (history that drives statements / reports) -----
  INSERT INTO public.transactions (transaction_id, reference_number, source_account_id, destination_account_id, amount, transaction_type, status, description, executed_at) VALUES
    -- Carol: opening deposits, transfer between her own accounts, a bill payment, a credit purchase
    ('2b000000-0000-0000-0000-00000000c101', 'TXN-DEMO-0001', NULL,         v_carol_chk,  5000.00, 'deposit',      'completed', 'Initial deposit',                NOW() - INTERVAL '60 days'),
    ('2b000000-0000-0000-0000-00000000c102', 'TXN-DEMO-0002', NULL,         v_carol_sav,  9000.00, 'deposit',      'completed', 'Initial savings deposit',        NOW() - INTERVAL '60 days'),
    ('2b000000-0000-0000-0000-00000000c103', 'TXN-DEMO-0003', v_carol_chk,  v_carol_sav,   500.00, 'transfer',     'completed', 'Save for vacation',              NOW() - INTERVAL '40 days'),
    ('2b000000-0000-0000-0000-00000000c104', 'TXN-DEMO-0004', v_carol_chk,  NULL,           80.00, 'withdrawal',   'completed', 'ATM withdrawal',                 NOW() - INTERVAL '15 days'),
    ('2b000000-0000-0000-0000-00000000c105', 'TXN-DEMO-0005', v_carol_chk,  NULL,           20.00, 'bill_payment', 'completed', 'Disney+ subscription',           NOW() - INTERVAL '4 days'),
    ('2b000000-0000-0000-0000-00000000c106', 'TXN-DEMO-0006', v_carol_cred, NULL,          487.32, 'credit_purchase','completed','Online purchase - Amazon',       NOW() - INTERVAL '6 days'),
    ('2b000000-0000-0000-0000-00000000c107', 'TXN-DEMO-0007', NULL,         v_carol_chk,   125.50, 'deposit',      'completed', 'Cheque deposit (mobile)',        NOW() - INTERVAL '3 days'),
    -- David: payroll, transfer to savings, send to Carol
    ('2b000000-0000-0000-0000-00000000c201', 'TXN-DEMO-0101', NULL,         v_david_chk,  2500.00, 'deposit',      'completed', 'Payroll - ACME Corp',            NOW() - INTERVAL '14 days'),
    ('2b000000-0000-0000-0000-00000000c202', 'TXN-DEMO-0102', v_david_chk,  v_david_sav,   200.00, 'transfer',     'completed', 'Auto-save',                      NOW() - INTERVAL '13 days'),
    ('2b000000-0000-0000-0000-00000000c203', 'TXN-DEMO-0103', v_david_chk,  v_carol_chk,   125.00, 'transfer',     'completed', 'Rent reimbursement',             NOW() - INTERVAL '8 days'),
    ('2b000000-0000-0000-0000-00000000c204', 'TXN-DEMO-0104', v_david_chk,  NULL,          150.00, 'withdrawal',   'completed', 'ATM withdrawal',                 NOW() - INTERVAL '2 days'),
    -- Emma: high-balance customer, savings interest, bill payments
    ('2b000000-0000-0000-0000-00000000c301', 'TXN-DEMO-0201', NULL,         v_emma_chk,   8000.00, 'deposit',      'completed', 'Initial deposit',                NOW() - INTERVAL '90 days'),
    ('2b000000-0000-0000-0000-00000000c302', 'TXN-DEMO-0202', NULL,         v_emma_sav,  25000.00, 'deposit',      'completed', 'Transfer from external bank',    NOW() - INTERVAL '90 days'),
    ('2b000000-0000-0000-0000-00000000c303', 'TXN-DEMO-0203', v_emma_chk,   NULL,           89.99, 'bill_payment', 'completed', 'Comcast internet',               NOW() - INTERVAL '34 days'),
    ('2b000000-0000-0000-0000-00000000c304', 'TXN-DEMO-0204', v_emma_chk,   NULL,           89.99, 'bill_payment', 'completed', 'Comcast internet',               NOW() - INTERVAL '4 days'),
    ('2b000000-0000-0000-0000-00000000c305', 'TXN-DEMO-0205', NULL,         v_emma_sav,     12.50, 'interest',     'completed', 'Savings interest',               NOW() - INTERVAL '1 day'),
    -- Grace: just opened account
    ('2b000000-0000-0000-0000-00000000c501', 'TXN-DEMO-0301', NULL,         v_grace_chk,   500.00, 'deposit',      'completed', 'Opening deposit',                NOW() - INTERVAL '7 days');

  -- ----- Cheque deposit (Carol's mobile deposit) -----
  INSERT INTO public.cheque_deposits (cheque_deposit_id, transaction_id, image_url, created_at) VALUES
    ('4d000000-0000-0000-0000-00000000c101', '2b000000-0000-0000-0000-00000000c107', 'cheques/demo/carol-cheque-001.jpg', NOW() - INTERVAL '3 days');

  -- ----- Bill schedules + payment_executions -----
  -- Carol: monthly Disney+ (1 successful execution already)
  INSERT INTO public.bill_schedules (schedule_id, account_id, payee_id, nickname, amount, currency, frequency, start_date, end_date, next_payment_date, status, created_at) VALUES
    ('5e000000-0000-0000-0000-00000000c101', v_carol_chk, v_emma_chk, 'Disney+', 20.00, 'USD', 'monthly',
      CURRENT_DATE - INTERVAL '34 days', CURRENT_DATE + INTERVAL '180 days',
      CURRENT_DATE + INTERVAL '26 days', 'active', NOW() - INTERVAL '34 days');
  -- Emma: monthly Comcast (2 successful executions)
  INSERT INTO public.bill_schedules (schedule_id, account_id, payee_id, nickname, amount, currency, frequency, start_date, end_date, next_payment_date, status, created_at) VALUES
    ('5e000000-0000-0000-0000-00000000c301', v_emma_chk, v_carol_chk, 'Comcast', 89.99, 'USD', 'monthly',
      CURRENT_DATE - INTERVAL '64 days', NULL,
      CURRENT_DATE + INTERVAL '26 days', 'active', NOW() - INTERVAL '64 days');

  INSERT INTO public.payment_executions (execution_id, schedule_id, transaction_id, scheduled_date, actual_execution_at, status, retry_count) VALUES
    ('6f000000-0000-0000-0000-00000000c101', '5e000000-0000-0000-0000-00000000c101', '2b000000-0000-0000-0000-00000000c105', CURRENT_DATE - INTERVAL '4 days',  NOW() - INTERVAL '4 days',  'success', 0),
    ('6f000000-0000-0000-0000-00000000c301', '5e000000-0000-0000-0000-00000000c301', '2b000000-0000-0000-0000-00000000c303', CURRENT_DATE - INTERVAL '34 days', NOW() - INTERVAL '34 days', 'success', 0),
    ('6f000000-0000-0000-0000-00000000c302', '5e000000-0000-0000-0000-00000000c301', '2b000000-0000-0000-0000-00000000c304', CURRENT_DATE - INTERVAL '4 days',  NOW() - INTERVAL '4 days',  'success', 0);

  -- ----- Loans -----
  -- Carol: active loan in repayment.
  INSERT INTO public.loans (
    loan_id, customer_id, checking_account_id, principal_amount, term_months, annual_interest_rate,
    monthly_income, monthly_housing_payment, existing_credit_debt, employment_status, purpose,
    status, risk_score, risk_tier, recommended_decision, risk_summary,
    debt_to_income_ratio, estimated_monthly_payment,
    outstanding_principal, accrued_interest, total_interest_charged, total_paid,
    reviewed_by_user_id, admin_decision_notes, reviewed_at, disbursed_at, last_interest_accrued_at,
    created_at, updated_at
  ) VALUES (
    '7a000000-0000-0000-0000-00000000c101', v_carol_cust, v_carol_chk, 10000.00, 24, 8.50,
    7500.00, 1800.00, 487.32, 'full_time', 'Home renovation',
    'active', 78, 'good', 'approve', 'Strong income, low DTI; recommend approval at 8.50% APR.',
    0.3050, 454.10,
    9215.40, 65.32, 195.65, 989.16,
    'a0000000-0000-0000-0000-000000000001', 'Approved at 8.50% APR.',
    NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '42 days', NOW() - INTERVAL '1 day'
  );
  -- Emma: pending loan application (manager review queue).
  INSERT INTO public.loans (
    loan_id, customer_id, checking_account_id, principal_amount, term_months, annual_interest_rate,
    monthly_income, monthly_housing_payment, existing_credit_debt, employment_status, purpose,
    status, risk_score, risk_tier, recommended_decision, risk_summary,
    debt_to_income_ratio, estimated_monthly_payment,
    outstanding_principal, accrued_interest, total_interest_charged, total_paid,
    created_at, updated_at
  ) VALUES (
    '7a000000-0000-0000-0000-00000000c301', v_emma_cust, v_emma_chk, 25000.00, 36, 6.75,
    9200.00, 2400.00, 0.00, 'full_time', 'Vehicle purchase',
    'pending', 88, 'good', 'approve', 'Excellent profile; recommend approval at 6.75% APR.',
    0.2609, 768.43,
    0.00, 0.00, 0.00, 0.00,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  );

  -- ----- Bank income (from Carol's loan interest accrual + a fee) -----
  INSERT INTO public.bank_income (income_id, source_transaction_id, source_account_id, reference_number, income_category, amount, description, recognized_at) VALUES
    ('8b000000-0000-0000-0000-00000000c101', '2b000000-0000-0000-0000-00000000c101', v_carol_chk, 'LINT-DEMO-0001', 'interest_charge', 195.65, 'Loan interest charge', NOW() - INTERVAL '5 days');

  -- ----- Savings monthly activity (Reg D-style cap tracking) -----
  INSERT INTO public.savings_monthly_activity (account_id, month_key, opening_balance, withdrawal_cap_amount, withdrawn_amount, interest_credited_amount, interest_credited_at, created_at, updated_at) VALUES
    (v_carol_sav, date_trunc('month', CURRENT_DATE)::date, 9106.06, 910.61, 0.00, 0.00, NULL,                       NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days'),
    (v_emma_sav,  date_trunc('month', CURRENT_DATE)::date, 24987.50, 2498.75, 0.00, 12.50, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day');

END $$;
