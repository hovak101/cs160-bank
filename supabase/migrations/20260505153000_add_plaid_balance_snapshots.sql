alter table "public"."plaid_linked_accounts"
  add column if not exists "available_balance" numeric(15,2),
  add column if not exists "current_balance" numeric(15,2),
  add column if not exists "balance_synced_at" timestamp with time zone;

create index if not exists "plaid_linked_accounts_plaid_item_id_idx"
  on "public"."plaid_linked_accounts" ("plaid_item_id");
