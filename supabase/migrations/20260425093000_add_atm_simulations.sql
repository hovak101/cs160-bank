create extension if not exists pgcrypto;

create table if not exists "public"."atm_simulations" (
  "atm_simulation_id" uuid primary key default gen_random_uuid(),
  "customer_id" uuid not null references "public"."customers"("customer_id") on delete cascade,
  "account_id" uuid not null references "public"."accounts"("account_id") on delete cascade,
  "transaction_id" uuid not null unique references "public"."transactions"("transaction_id") on delete cascade,
  "atm_id" text not null,
  "atm_name" text not null,
  "atm_location" text not null,
  "action" character varying not null,
  "amount" numeric(15,2) not null,
  "verification_code" character varying(16),
  "status" character varying not null default 'pending',
  "created_at" timestamp with time zone not null default now(),
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone not null default now(),
  constraint "atm_simulations_action_check" check ((action)::text = any ((array['withdraw'::character varying, 'deposit'::character varying])::text[])),
  constraint "atm_simulations_amount_check" check (amount > (0)::numeric),
  constraint "atm_simulations_status_check" check ((status)::text = any ((array['pending'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))
);

create index if not exists "atm_simulations_customer_status_idx"
  on "public"."atm_simulations" ("customer_id", "status", "created_at" desc);

create index if not exists "atm_simulations_account_status_idx"
  on "public"."atm_simulations" ("account_id", "status", "created_at" desc);

create unique index if not exists "atm_simulations_verification_code_key"
  on "public"."atm_simulations" ("verification_code")
  where "verification_code" is not null;

alter table "public"."atm_simulations" enable row level security;

create policy "Customers can read own ATM simulations"
on "public"."atm_simulations"
for select
to authenticated
using (
  exists (
    select 1
    from "public"."customers" c
    where c."customer_id" = "atm_simulations"."customer_id"
      and c."user_id" = auth.uid()
  )
);

create policy "Customers can insert own ATM simulations"
on "public"."atm_simulations"
for insert
to authenticated
with check (
  exists (
    select 1
    from "public"."customers" c
    where c."customer_id" = "atm_simulations"."customer_id"
      and c."user_id" = auth.uid()
  )
);

create policy "Customers can update own ATM simulations"
on "public"."atm_simulations"
for update
to authenticated
using (
  exists (
    select 1
    from "public"."customers" c
    where c."customer_id" = "atm_simulations"."customer_id"
      and c."user_id" = auth.uid()
  )
)
with check (
  exists (
    select 1
    from "public"."customers" c
    where c."customer_id" = "atm_simulations"."customer_id"
      and c."user_id" = auth.uid()
  )
);

alter table "public"."transactions" drop constraint if exists "transactions_transaction_type_check";

alter table "public"."transactions" add constraint "transactions_transaction_type_check"
check (
  (("transaction_type")::text = any (
    (
      array[
        'deposit'::character varying,
        'withdrawal'::character varying,
        'transfer'::character varying,
        'fee'::character varying,
        'interest'::character varying,
        'bill_payment'::character varying,
        'cashbox_send'::character varying,
        'cashbox_withdraw'::character varying,
        'credit_purchase'::character varying,
        'loan_payment'::character varying,
        'credit_payment'::character varying,
        'loan_disbursement'::character varying,
        'atm_withdrawal'::character varying,
        'atm_deposit'::character varying
      ]
    )::text[]
  ))
) not valid;

alter table "public"."transactions" validate constraint "transactions_transaction_type_check";
