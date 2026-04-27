-- =============================================================================
-- Seed Data for Vitality Bank Local Development
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
