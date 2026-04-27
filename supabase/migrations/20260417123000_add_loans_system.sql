alter table "public"."transactions" drop constraint if exists "transactions_transaction_type_check";

create table "public"."loans" (
  "loan_id" uuid not null default gen_random_uuid(),
  "customer_id" uuid not null,
  "checking_account_id" uuid not null,
  "principal_amount" numeric(15,2) not null,
  "term_months" integer not null,
  "annual_interest_rate" numeric(5,2) not null,
  "monthly_income" numeric(15,2) not null,
  "monthly_housing_payment" numeric(15,2) not null default 0,
  "existing_credit_debt" numeric(15,2) not null default 0,
  "employment_status" character varying(30) not null,
  "purpose" text,
  "other_financial_notes" text,
  "status" character varying(20) not null default 'pending',
  "risk_score" integer not null default 0,
  "risk_tier" character varying(20) not null default 'bad',
  "recommended_decision" character varying(20) not null default 'decline',
  "risk_summary" text,
  "debt_to_income_ratio" numeric(8,4) not null default 0,
  "estimated_monthly_payment" numeric(15,2) not null default 0,
  "outstanding_principal" numeric(15,2) not null default 0,
  "accrued_interest" numeric(15,2) not null default 0,
  "total_interest_charged" numeric(15,2) not null default 0,
  "total_paid" numeric(15,2) not null default 0,
  "reviewed_by_user_id" uuid,
  "admin_decision_notes" text,
  "reviewed_at" timestamp without time zone,
  "disbursed_at" timestamp without time zone,
  "last_interest_accrued_at" timestamp without time zone,
  "last_payment_at" timestamp without time zone,
  "paid_off_at" timestamp without time zone,
  "created_at" timestamp without time zone not null default now(),
  "updated_at" timestamp without time zone not null default now(),
  constraint "loans_pkey" primary key ("loan_id"),
  constraint "loans_customer_id_fkey"
    foreign key ("customer_id")
    references "public"."customers"("customer_id")
    on delete cascade,
  constraint "loans_checking_account_id_fkey"
    foreign key ("checking_account_id")
    references "public"."accounts"("account_id")
    on delete restrict,
  constraint "loans_principal_amount_check" check (principal_amount > 0),
  constraint "loans_term_months_check" check ((term_months >= 6) and (term_months <= 84)),
  constraint "loans_annual_interest_rate_check" check ((annual_interest_rate >= 0) and (annual_interest_rate <= 100)),
  constraint "loans_monthly_income_check" check (monthly_income > 0),
  constraint "loans_monthly_housing_payment_check" check (monthly_housing_payment >= 0),
  constraint "loans_existing_credit_debt_check" check (existing_credit_debt >= 0),
  constraint "loans_risk_score_check" check ((risk_score >= 0) and (risk_score <= 100)),
  constraint "loans_debt_to_income_ratio_check" check (debt_to_income_ratio >= 0),
  constraint "loans_estimated_monthly_payment_check" check (estimated_monthly_payment >= 0),
  constraint "loans_outstanding_principal_check" check (outstanding_principal >= 0),
  constraint "loans_accrued_interest_check" check (accrued_interest >= 0),
  constraint "loans_total_interest_charged_check" check (total_interest_charged >= 0),
  constraint "loans_total_paid_check" check (total_paid >= 0),
  constraint "loans_status_check"
    check ((status)::text = any ((array['pending'::character varying, 'active'::character varying, 'rejected'::character varying, 'paid'::character varying])::text[])),
  constraint "loans_risk_tier_check"
    check ((risk_tier)::text = any ((array['good'::character varying, 'review'::character varying, 'bad'::character varying])::text[])),
  constraint "loans_recommended_decision_check"
    check ((recommended_decision)::text = any ((array['approve'::character varying, 'review'::character varying, 'decline'::character varying])::text[])),
  constraint "loans_employment_status_check"
    check ((employment_status)::text = any ((array[
      'full_time'::character varying,
      'part_time'::character varying,
      'self_employed'::character varying,
      'contract'::character varying,
      'student'::character varying,
      'retired'::character varying,
      'unemployed'::character varying
    ])::text[]))
);

create index "loans_customer_id_idx"
  on "public"."loans" using btree ("customer_id");

create index "loans_status_idx"
  on "public"."loans" using btree ("status");

create index "loans_created_at_idx"
  on "public"."loans" using btree ("created_at" desc);

alter table "public"."loans" enable row level security;

create or replace function public.ensure_loan_parent_account_is_checking()
returns trigger
language plpgsql
as $function$
declare
  linked_customer_id uuid;
  linked_account_type public.account_type;
begin
  select customer_id, account_type
  into linked_customer_id, linked_account_type
  from public.accounts
  where account_id = new.checking_account_id;

  if linked_customer_id is null then
    raise exception 'Checking account % does not exist.', new.checking_account_id;
  end if;

  if linked_customer_id <> new.customer_id then
    raise exception 'Loan checking account must belong to the same customer.';
  end if;

  if linked_account_type <> 'checking'::public.account_type then
    raise exception 'Loans must be linked to a checking account.';
  end if;

  return new;
end;
$function$;

create trigger "trg_loans_validate_checking_parent"
before insert or update on "public"."loans"
for each row
execute function public.ensure_loan_parent_account_is_checking();

grant delete on table "public"."loans" to "anon";
grant insert on table "public"."loans" to "anon";
grant references on table "public"."loans" to "anon";
grant select on table "public"."loans" to "anon";
grant trigger on table "public"."loans" to "anon";
grant truncate on table "public"."loans" to "anon";
grant update on table "public"."loans" to "anon";

grant delete on table "public"."loans" to "authenticated";
grant insert on table "public"."loans" to "authenticated";
grant references on table "public"."loans" to "authenticated";
grant select on table "public"."loans" to "authenticated";
grant trigger on table "public"."loans" to "authenticated";
grant truncate on table "public"."loans" to "authenticated";
grant update on table "public"."loans" to "authenticated";

grant delete on table "public"."loans" to "service_role";
grant insert on table "public"."loans" to "service_role";
grant references on table "public"."loans" to "service_role";
grant select on table "public"."loans" to "service_role";
grant trigger on table "public"."loans" to "service_role";
grant truncate on table "public"."loans" to "service_role";
grant update on table "public"."loans" to "service_role";

create policy "Allow admins to read all loans"
on "public"."loans"
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

create policy "Allow admins to update all loans"
on "public"."loans"
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.user_id = auth.uid()
      and users.role = 'admin'::public.role
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.user_id = auth.uid()
      and users.role = 'admin'::public.role
  )
);

create policy "Users can view their own loans"
on "public"."loans"
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.customers
    where customers.customer_id = loans.customer_id
      and customers.user_id = auth.uid()
  )
);

create policy "Users can insert their own loans"
on "public"."loans"
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customers
    where customers.customer_id = loans.customer_id
      and customers.user_id = auth.uid()
  )
);

create policy "Users can update their own loans"
on "public"."loans"
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.customers
    where customers.customer_id = loans.customer_id
      and customers.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.customers
    where customers.customer_id = loans.customer_id
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
        'loan_disbursement'::character varying,
        'loan_payment'::character varying,
        'fee'::character varying,
        'interest'::character varying
      ]
    )::text[]
  ))
) not valid;

alter table "public"."transactions" validate constraint "transactions_transaction_type_check";
