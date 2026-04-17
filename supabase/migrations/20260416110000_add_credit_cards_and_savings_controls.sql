create table "public"."credit_cards" (
  "card_id" uuid not null default gen_random_uuid(),
  "account_id" uuid not null,
  "cardholder_name" text not null,
  "card_brand" character varying(50) not null default 'Visa',
  "card_last4" character varying(4) not null,
  "card_status" character varying(20) not null default 'active',
  "rewards_program" character varying(100) not null default 'Cash Back',
  "rewards_rate" numeric(6,4) not null default 0.015,
  "exp_month" integer not null,
  "exp_year" integer not null,
  "created_at" timestamp without time zone not null default now(),
  "updated_at" timestamp without time zone not null default now(),
  constraint "credit_cards_pkey" primary key ("card_id"),
  constraint "credit_cards_account_id_key" unique ("account_id"),
  constraint "credit_cards_account_id_fkey"
    foreign key ("account_id")
    references "public"."credit_accounts"("account_id")
    on delete cascade,
  constraint "credit_cards_card_status_check"
    check ((card_status)::text = any ((array['active'::character varying, 'locked'::character varying, 'expired'::character varying])::text[])),
  constraint "credit_cards_rewards_rate_check" check (rewards_rate >= 0),
  constraint "credit_cards_exp_month_check" check ((exp_month >= 1) and (exp_month <= 12))
);

alter table "public"."credit_cards" enable row level security;

alter table "public"."credit_accounts"
  add column "purchase_apr" numeric(5,2) not null default 24.99,
  add column "cash_advance_apr" numeric(5,2) not null default 29.99,
  add column "cash_advance_limit" numeric(15,2) not null default 0,
  add column "cash_advance_balance" numeric(15,2) not null default 0,
  add column "late_fee_amount" numeric(15,2) not null default 35,
  add column "rewards_points" numeric(15,2) not null default 0;

update "public"."credit_accounts"
set "cash_advance_limit" = round(("credit_limit" * 0.30)::numeric, 2)
where "cash_advance_limit" = 0;

alter table "public"."credit_accounts"
  add constraint "credit_accounts_purchase_apr_check" check ((purchase_apr >= 0) and (purchase_apr <= 100)),
  add constraint "credit_accounts_cash_advance_apr_check" check ((cash_advance_apr >= 0) and (cash_advance_apr <= 100)),
  add constraint "credit_accounts_cash_advance_limit_check" check (cash_advance_limit >= 0),
  add constraint "credit_accounts_cash_advance_balance_check" check (cash_advance_balance >= 0),
  add constraint "credit_accounts_late_fee_amount_check" check (late_fee_amount >= 0),
  add constraint "credit_accounts_rewards_points_check" check (rewards_points >= 0);

create table "public"."savings_monthly_activity" (
  "account_id" uuid not null,
  "month_key" date not null,
  "opening_balance" numeric(15,2) not null,
  "withdrawal_cap_amount" numeric(15,2) not null,
  "withdrawn_amount" numeric(15,2) not null default 0,
  "interest_credited_amount" numeric(15,2) not null default 0,
  "interest_credited_at" timestamp without time zone,
  "created_at" timestamp without time zone not null default now(),
  "updated_at" timestamp without time zone not null default now(),
  constraint "savings_monthly_activity_pkey" primary key ("account_id", "month_key"),
  constraint "savings_monthly_activity_account_id_fkey"
    foreign key ("account_id")
    references "public"."accounts"("account_id")
    on delete cascade,
  constraint "savings_monthly_activity_opening_balance_check" check (opening_balance >= 0),
  constraint "savings_monthly_activity_withdrawal_cap_amount_check" check (withdrawal_cap_amount >= 0),
  constraint "savings_monthly_activity_withdrawn_amount_check" check (withdrawn_amount >= 0),
  constraint "savings_monthly_activity_interest_credited_amount_check" check (interest_credited_amount >= 0)
);

alter table "public"."savings_monthly_activity" enable row level security;

create or replace function public.ensure_savings_monthly_activity_parent_is_saving()
returns trigger
language plpgsql
as $function$
declare
  linked_account_type public.account_type;
begin
  select account_type
  into linked_account_type
  from public.accounts
  where account_id = new.account_id;

  if linked_account_type is null then
    raise exception 'Parent account % does not exist.', new.account_id;
  end if;

  if linked_account_type <> 'saving'::public.account_type then
    raise exception 'savings_monthly_activity requires accounts.account_type = saving for account %.', new.account_id;
  end if;

  return new;
end;
$function$;

create trigger "trg_savings_monthly_activity_validate_parent"
before insert or update on "public"."savings_monthly_activity"
for each row
execute function public.ensure_savings_monthly_activity_parent_is_saving();

grant delete on table "public"."credit_cards" to "anon";
grant insert on table "public"."credit_cards" to "anon";
grant references on table "public"."credit_cards" to "anon";
grant select on table "public"."credit_cards" to "anon";
grant trigger on table "public"."credit_cards" to "anon";
grant truncate on table "public"."credit_cards" to "anon";
grant update on table "public"."credit_cards" to "anon";

grant delete on table "public"."credit_cards" to "authenticated";
grant insert on table "public"."credit_cards" to "authenticated";
grant references on table "public"."credit_cards" to "authenticated";
grant select on table "public"."credit_cards" to "authenticated";
grant trigger on table "public"."credit_cards" to "authenticated";
grant truncate on table "public"."credit_cards" to "authenticated";
grant update on table "public"."credit_cards" to "authenticated";

grant delete on table "public"."credit_cards" to "service_role";
grant insert on table "public"."credit_cards" to "service_role";
grant references on table "public"."credit_cards" to "service_role";
grant select on table "public"."credit_cards" to "service_role";
grant trigger on table "public"."credit_cards" to "service_role";
grant truncate on table "public"."credit_cards" to "service_role";
grant update on table "public"."credit_cards" to "service_role";

grant delete on table "public"."savings_monthly_activity" to "anon";
grant insert on table "public"."savings_monthly_activity" to "anon";
grant references on table "public"."savings_monthly_activity" to "anon";
grant select on table "public"."savings_monthly_activity" to "anon";
grant trigger on table "public"."savings_monthly_activity" to "anon";
grant truncate on table "public"."savings_monthly_activity" to "anon";
grant update on table "public"."savings_monthly_activity" to "anon";

grant delete on table "public"."savings_monthly_activity" to "authenticated";
grant insert on table "public"."savings_monthly_activity" to "authenticated";
grant references on table "public"."savings_monthly_activity" to "authenticated";
grant select on table "public"."savings_monthly_activity" to "authenticated";
grant trigger on table "public"."savings_monthly_activity" to "authenticated";
grant truncate on table "public"."savings_monthly_activity" to "authenticated";
grant update on table "public"."savings_monthly_activity" to "authenticated";

grant delete on table "public"."savings_monthly_activity" to "service_role";
grant insert on table "public"."savings_monthly_activity" to "service_role";
grant references on table "public"."savings_monthly_activity" to "service_role";
grant select on table "public"."savings_monthly_activity" to "service_role";
grant trigger on table "public"."savings_monthly_activity" to "service_role";
grant truncate on table "public"."savings_monthly_activity" to "service_role";
grant update on table "public"."savings_monthly_activity" to "service_role";

create policy "Allow admins to read all credit cards"
on "public"."credit_cards"
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.user_id = auth.uid()
      and users.role = 'admin'::public.role
  )
);

create policy "Users can manage their own credit cards"
on "public"."credit_cards"
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from public.accounts
    join public.customers on customers.customer_id = accounts.customer_id
    where accounts.account_id = credit_cards.account_id
      and customers.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.accounts
    join public.customers on customers.customer_id = accounts.customer_id
    where accounts.account_id = credit_cards.account_id
      and customers.user_id = auth.uid()
  )
);

create policy "Allow admins to read all savings monthly activity"
on "public"."savings_monthly_activity"
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.user_id = auth.uid()
      and users.role = 'admin'::public.role
  )
);

create policy "Users can manage their own savings monthly activity"
on "public"."savings_monthly_activity"
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from public.accounts
    join public.customers on customers.customer_id = accounts.customer_id
    where accounts.account_id = savings_monthly_activity.account_id
      and customers.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.accounts
    join public.customers on customers.customer_id = accounts.customer_id
    where accounts.account_id = savings_monthly_activity.account_id
      and customers.user_id = auth.uid()
  )
);
