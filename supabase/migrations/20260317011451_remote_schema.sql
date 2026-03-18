drop policy "Customer can create own account" on "public"."accounts";

drop policy "Customer can update own account" on "public"."accounts";

drop policy "Customer can view own accounts" on "public"."accounts";

alter table "public"."accounts" drop constraint "accounts_account_number_key";

alter table "public"."accounts" drop constraint "fk_customer";

alter table "public"."accounts" drop constraint "accounts_pkey";

drop index if exists "public"."accounts_account_number_key";

drop index if exists "public"."accounts_pkey";

alter table "public"."accounts" alter column "account_id" set default extensions.uuid_generate_v4();

alter table "public"."accounts" disable row level security;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- tạo row trong public.users
  insert into public.users (
    user_id,
    email,
    role,
    is_active,
    mfa_enabled,
    failed_login_attempts,
    created_at
  )
  values (
    new.id,
    new.email,
    'customer',
    true,
    false,
    0,
    now()
  )
  on conflict (user_id) do nothing;

  -- tạo row trống trong public.customers
  insert into public.customers (
    user_id,
    first_name,
    last_name,
    phone_number,
    tax_id,
    address_line_1,
    address_line_2,
    city,
    state,
    zip_code,
    country,
    kyc_status,
    created_at
  )
  values (
    new.id,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'USA',
    'pending',
    now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;


