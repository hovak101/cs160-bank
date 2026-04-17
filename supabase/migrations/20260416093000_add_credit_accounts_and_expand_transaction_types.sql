alter table "public"."transactions" drop constraint if exists "transactions_transaction_type_check";


create table "public"."credit_accounts" (
  "account_id" uuid not null,
  "credit_limit" numeric(15,2) not null,
  "current_balance" numeric(15,2) not null default 0,
  "available_credit" numeric(15,2) generated always as (greatest((credit_limit - current_balance), (0)::numeric)) stored,
  "statement_balance" numeric(15,2) not null default 0,
  "minimum_payment_due" numeric(15,2) not null default 0,
  "apr" numeric(5,2) not null default 0,
  "last_statement_at" timestamp without time zone,
  "next_statement_at" timestamp without time zone,
  "payment_due_at" timestamp without time zone,
  "last_payment_at" timestamp without time zone,
  "created_at" timestamp without time zone not null default now(),
  "updated_at" timestamp without time zone not null default now(),
  constraint "credit_accounts_pkey" primary key ("account_id"),
  constraint "credit_accounts_account_id_fkey"
    foreign key ("account_id")
    references "public"."accounts"("account_id")
    on delete cascade,
  constraint "credit_accounts_credit_limit_check" check (credit_limit >= 0),
  constraint "credit_accounts_current_balance_check" check (current_balance >= 0),
  constraint "credit_accounts_statement_balance_check" check (statement_balance >= 0),
  constraint "credit_accounts_minimum_payment_due_check" check (minimum_payment_due >= 0),
  constraint "credit_accounts_apr_check" check ((apr >= 0) and (apr <= 100))
);

alter table "public"."credit_accounts" enable row level security;

create index "credit_accounts_payment_due_at_idx"
  on "public"."credit_accounts" using btree ("payment_due_at");

create index "credit_accounts_next_statement_at_idx"
  on "public"."credit_accounts" using btree ("next_statement_at");

create or replace function public.ensure_credit_account_parent_is_credit()
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

  if linked_account_type <> 'credit'::public.account_type then
    raise exception 'credit_accounts requires accounts.account_type = credit for account %.', new.account_id;
  end if;

  return new;
end;
$function$;

create trigger "trg_credit_accounts_validate_parent"
before insert or update on "public"."credit_accounts"
for each row
execute function public.ensure_credit_account_parent_is_credit();

grant delete on table "public"."credit_accounts" to "anon";
grant insert on table "public"."credit_accounts" to "anon";
grant references on table "public"."credit_accounts" to "anon";
grant select on table "public"."credit_accounts" to "anon";
grant trigger on table "public"."credit_accounts" to "anon";
grant truncate on table "public"."credit_accounts" to "anon";
grant update on table "public"."credit_accounts" to "anon";

grant delete on table "public"."credit_accounts" to "authenticated";
grant insert on table "public"."credit_accounts" to "authenticated";
grant references on table "public"."credit_accounts" to "authenticated";
grant select on table "public"."credit_accounts" to "authenticated";
grant trigger on table "public"."credit_accounts" to "authenticated";
grant truncate on table "public"."credit_accounts" to "authenticated";
grant update on table "public"."credit_accounts" to "authenticated";

grant delete on table "public"."credit_accounts" to "service_role";
grant insert on table "public"."credit_accounts" to "service_role";
grant references on table "public"."credit_accounts" to "service_role";
grant select on table "public"."credit_accounts" to "service_role";
grant trigger on table "public"."credit_accounts" to "service_role";
grant truncate on table "public"."credit_accounts" to "service_role";
grant update on table "public"."credit_accounts" to "service_role";


create policy "Allow admins to read all credit accounts"
on "public"."credit_accounts"
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

create policy "Users can view their own credit accounts"
on "public"."credit_accounts"
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    join public.customers on customers.customer_id = accounts.customer_id
    where accounts.account_id = credit_accounts.account_id
      and customers.user_id = auth.uid()
  )
);

create policy "Users can insert their own credit accounts"
on "public"."credit_accounts"
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.accounts
    join public.customers on customers.customer_id = accounts.customer_id
    where accounts.account_id = credit_accounts.account_id
      and customers.user_id = auth.uid()
  )
);

create policy "Users can update their own credit accounts"
on "public"."credit_accounts"
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.accounts
    join public.customers on customers.customer_id = accounts.customer_id
    where accounts.account_id = credit_accounts.account_id
      and customers.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.accounts
    join public.customers on customers.customer_id = accounts.customer_id
    where accounts.account_id = credit_accounts.account_id
      and customers.user_id = auth.uid()
  )
);


alter table "public"."transactions" add constraint "transactions_transaction_type_check"
check (
  ((transaction_type)::text = any (
    (
      array[
        'deposit'::character varying,
        'withdrawal'::character varying,
        'transfer'::character varying,
        'bill_payment'::character varying,
        'cashbox_send'::character varying,
        'cashbox_withdraw'::character varying,
        'credit_purchase'::character varying,
        'credit_payment'::character varying,
        'fee'::character varying,
        'interest'::character varying
      ]
    )::text[]
  ))
) not valid;

alter table "public"."transactions" validate constraint "transactions_transaction_type_check";
