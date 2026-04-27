create table if not exists "public"."plaid_linked_accounts" (
  "linked_account_id" uuid primary key default gen_random_uuid(),
  "customer_id" uuid not null references "public"."customers"("customer_id") on delete cascade,
  "plaid_item_id" text not null,
  "plaid_account_id" text not null,
  "encrypted_access_token" text not null,
  "access_token_iv" text not null,
  "access_token_auth_tag" text not null,
  "institution_name" text,
  "plaid_account_name" text not null,
  "plaid_account_official_name" text,
  "plaid_account_mask" text,
  "plaid_account_type" text,
  "plaid_account_subtype" text,
  "status" text not null default 'active',
  "last_verified_at" timestamp with time zone default now(),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  constraint "plaid_linked_accounts_status_check" check (
    "status" in ('active', 'disconnected')
  ),
  constraint "plaid_linked_accounts_customer_plaid_account_key" unique ("customer_id", "plaid_account_id")
);

create index if not exists "plaid_linked_accounts_customer_id_idx"
  on "public"."plaid_linked_accounts" ("customer_id");

create index if not exists "plaid_linked_accounts_customer_status_idx"
  on "public"."plaid_linked_accounts" ("customer_id", "status");

alter table "public"."plaid_linked_accounts" enable row level security;

grant all on table "public"."plaid_linked_accounts" to "service_role";
