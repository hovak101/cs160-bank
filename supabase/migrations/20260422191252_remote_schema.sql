alter table "public"."bill_schedules" drop constraint "bill_schedules_frequency_check";

alter table "public"."bill_schedules" drop constraint "bill_schedules_status_check";

alter table "public"."payment_executions" drop constraint "payment_executions_status_check";

alter table "public"."transactions" drop constraint "transactions_status_check";

alter table "public"."transactions" drop constraint "transactions_transaction_type_check";


  create table "public"."bank_income" (
    "income_id" uuid not null default gen_random_uuid(),
    "source_transaction_id" uuid not null,
    "source_account_id" uuid,
    "reference_number" text,
    "income_category" character varying(50) not null,
    "amount" numeric(15,2) not null,
    "description" text,
    "recognized_at" timestamp without time zone not null default now(),
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );


alter table "public"."bank_income" enable row level security;


  create table "public"."cheque_deposits" (
    "cheque_deposit_id" uuid not null default gen_random_uuid(),
    "transaction_id" uuid not null,
    "image_url" text not null,
    "created_at" timestamp without time zone not null default now()
      );



  create table "public"."credit_accounts" (
    "account_id" uuid not null,
    "credit_limit" numeric(15,2) not null,
    "current_balance" numeric(15,2) not null default 0,
    "available_credit" numeric(15,2) generated always as (GREATEST((credit_limit - current_balance), (0)::numeric)) stored,
    "statement_balance" numeric(15,2) not null default 0,
    "minimum_payment_due" numeric(15,2) not null default 0,
    "apr" numeric(5,2) not null default 0,
    "last_statement_at" timestamp without time zone,
    "next_statement_at" timestamp without time zone,
    "payment_due_at" timestamp without time zone,
    "last_payment_at" timestamp without time zone,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "purchase_apr" numeric(5,2) not null default 24.99,
    "cash_advance_apr" numeric(5,2) not null default 29.99,
    "cash_advance_limit" numeric(15,2) not null default 0,
    "cash_advance_balance" numeric(15,2) not null default 0,
    "late_fee_amount" numeric(15,2) not null default 35,
    "rewards_points" numeric(15,2) not null default 0
      );


alter table "public"."credit_accounts" enable row level security;


  create table "public"."credit_cards" (
    "card_id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "cardholder_name" text not null,
    "card_brand" character varying(50) not null default 'Visa'::character varying,
    "card_last4" character varying(4) not null,
    "card_status" character varying(20) not null default 'active'::character varying,
    "rewards_program" character varying(100) not null default 'Cash Back'::character varying,
    "rewards_rate" numeric(6,4) not null default 0.015,
    "exp_month" integer not null,
    "exp_year" integer not null,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );


alter table "public"."credit_cards" enable row level security;


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
    "status" character varying(20) not null default 'pending'::character varying,
    "risk_score" integer not null default 0,
    "risk_tier" character varying(20) not null default 'bad'::character varying,
    "recommended_decision" character varying(20) not null default 'decline'::character varying,
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
    "updated_at" timestamp without time zone not null default now()
      );


alter table "public"."loans" enable row level security;


  create table "public"."savings_monthly_activity" (
    "account_id" uuid not null,
    "month_key" date not null,
    "opening_balance" numeric(15,2) not null,
    "withdrawal_cap_amount" numeric(15,2) not null,
    "withdrawn_amount" numeric(15,2) not null default 0,
    "interest_credited_amount" numeric(15,2) not null default 0,
    "interest_credited_at" timestamp without time zone,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );


alter table "public"."savings_monthly_activity" enable row level security;

CREATE INDEX bank_income_category_idx ON public.bank_income USING btree (income_category);

CREATE UNIQUE INDEX bank_income_pkey ON public.bank_income USING btree (income_id);

CREATE INDEX bank_income_recognized_at_idx ON public.bank_income USING btree (recognized_at);

CREATE UNIQUE INDEX bank_income_source_transaction_id_key ON public.bank_income USING btree (source_transaction_id);

CREATE UNIQUE INDEX cheque_deposits_pkey ON public.cheque_deposits USING btree (cheque_deposit_id);

CREATE INDEX cheque_deposits_transaction_id_idx ON public.cheque_deposits USING btree (transaction_id);

CREATE INDEX credit_accounts_next_statement_at_idx ON public.credit_accounts USING btree (next_statement_at);

CREATE INDEX credit_accounts_payment_due_at_idx ON public.credit_accounts USING btree (payment_due_at);

CREATE UNIQUE INDEX credit_accounts_pkey ON public.credit_accounts USING btree (account_id);

CREATE UNIQUE INDEX credit_cards_account_id_key ON public.credit_cards USING btree (account_id);

CREATE UNIQUE INDEX credit_cards_pkey ON public.credit_cards USING btree (card_id);

CREATE INDEX loans_created_at_idx ON public.loans USING btree (created_at DESC);

CREATE INDEX loans_customer_id_idx ON public.loans USING btree (customer_id);

CREATE UNIQUE INDEX loans_pkey ON public.loans USING btree (loan_id);

CREATE INDEX loans_status_idx ON public.loans USING btree (status);

CREATE UNIQUE INDEX savings_monthly_activity_pkey ON public.savings_monthly_activity USING btree (account_id, month_key);

alter table "public"."bank_income" add constraint "bank_income_pkey" PRIMARY KEY using index "bank_income_pkey";

alter table "public"."cheque_deposits" add constraint "cheque_deposits_pkey" PRIMARY KEY using index "cheque_deposits_pkey";

alter table "public"."credit_accounts" add constraint "credit_accounts_pkey" PRIMARY KEY using index "credit_accounts_pkey";

alter table "public"."credit_cards" add constraint "credit_cards_pkey" PRIMARY KEY using index "credit_cards_pkey";

alter table "public"."loans" add constraint "loans_pkey" PRIMARY KEY using index "loans_pkey";

alter table "public"."savings_monthly_activity" add constraint "savings_monthly_activity_pkey" PRIMARY KEY using index "savings_monthly_activity_pkey";

alter table "public"."bank_income" add constraint "bank_income_amount_check" CHECK ((amount >= (0)::numeric)) not valid;

alter table "public"."bank_income" validate constraint "bank_income_amount_check";

alter table "public"."bank_income" add constraint "bank_income_category_check" CHECK (((income_category)::text = ANY (ARRAY[('fee'::character varying)::text, ('interest_charge'::character varying)::text]))) not valid;

alter table "public"."bank_income" validate constraint "bank_income_category_check";

alter table "public"."bank_income" add constraint "bank_income_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.accounts(account_id) ON DELETE SET NULL not valid;

alter table "public"."bank_income" validate constraint "bank_income_source_account_id_fkey";

alter table "public"."bank_income" add constraint "bank_income_source_transaction_id_fkey" FOREIGN KEY (source_transaction_id) REFERENCES public.transactions(transaction_id) ON DELETE CASCADE not valid;

alter table "public"."bank_income" validate constraint "bank_income_source_transaction_id_fkey";

alter table "public"."bank_income" add constraint "bank_income_source_transaction_id_key" UNIQUE using index "bank_income_source_transaction_id_key";

alter table "public"."cheque_deposits" add constraint "cheque_deposits_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.transactions(transaction_id) ON DELETE CASCADE not valid;

alter table "public"."cheque_deposits" validate constraint "cheque_deposits_transaction_id_fkey";

alter table "public"."credit_accounts" add constraint "credit_accounts_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_account_id_fkey";

alter table "public"."credit_accounts" add constraint "credit_accounts_apr_check" CHECK (((apr >= (0)::numeric) AND (apr <= (100)::numeric))) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_apr_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_cash_advance_apr_check" CHECK (((cash_advance_apr >= (0)::numeric) AND (cash_advance_apr <= (100)::numeric))) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_cash_advance_apr_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_cash_advance_balance_check" CHECK ((cash_advance_balance >= (0)::numeric)) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_cash_advance_balance_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_cash_advance_limit_check" CHECK ((cash_advance_limit >= (0)::numeric)) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_cash_advance_limit_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_credit_limit_check" CHECK ((credit_limit >= (0)::numeric)) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_credit_limit_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_current_balance_check" CHECK ((current_balance >= (0)::numeric)) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_current_balance_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_late_fee_amount_check" CHECK ((late_fee_amount >= (0)::numeric)) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_late_fee_amount_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_minimum_payment_due_check" CHECK ((minimum_payment_due >= (0)::numeric)) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_minimum_payment_due_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_purchase_apr_check" CHECK (((purchase_apr >= (0)::numeric) AND (purchase_apr <= (100)::numeric))) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_purchase_apr_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_rewards_points_check" CHECK ((rewards_points >= (0)::numeric)) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_rewards_points_check";

alter table "public"."credit_accounts" add constraint "credit_accounts_statement_balance_check" CHECK ((statement_balance >= (0)::numeric)) not valid;

alter table "public"."credit_accounts" validate constraint "credit_accounts_statement_balance_check";

alter table "public"."credit_cards" add constraint "credit_cards_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.credit_accounts(account_id) ON DELETE CASCADE not valid;

alter table "public"."credit_cards" validate constraint "credit_cards_account_id_fkey";

alter table "public"."credit_cards" add constraint "credit_cards_account_id_key" UNIQUE using index "credit_cards_account_id_key";

alter table "public"."credit_cards" add constraint "credit_cards_card_status_check" CHECK (((card_status)::text = ANY (ARRAY[('active'::character varying)::text, ('locked'::character varying)::text, ('expired'::character varying)::text]))) not valid;

alter table "public"."credit_cards" validate constraint "credit_cards_card_status_check";

alter table "public"."credit_cards" add constraint "credit_cards_exp_month_check" CHECK (((exp_month >= 1) AND (exp_month <= 12))) not valid;

alter table "public"."credit_cards" validate constraint "credit_cards_exp_month_check";

alter table "public"."credit_cards" add constraint "credit_cards_rewards_rate_check" CHECK ((rewards_rate >= (0)::numeric)) not valid;

alter table "public"."credit_cards" validate constraint "credit_cards_rewards_rate_check";

alter table "public"."loans" add constraint "loans_accrued_interest_check" CHECK ((accrued_interest >= (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_accrued_interest_check";

alter table "public"."loans" add constraint "loans_annual_interest_rate_check" CHECK (((annual_interest_rate >= (0)::numeric) AND (annual_interest_rate <= (100)::numeric))) not valid;

alter table "public"."loans" validate constraint "loans_annual_interest_rate_check";

alter table "public"."loans" add constraint "loans_checking_account_id_fkey" FOREIGN KEY (checking_account_id) REFERENCES public.accounts(account_id) ON DELETE RESTRICT not valid;

alter table "public"."loans" validate constraint "loans_checking_account_id_fkey";

alter table "public"."loans" add constraint "loans_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE not valid;

alter table "public"."loans" validate constraint "loans_customer_id_fkey";

alter table "public"."loans" add constraint "loans_debt_to_income_ratio_check" CHECK ((debt_to_income_ratio >= (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_debt_to_income_ratio_check";

alter table "public"."loans" add constraint "loans_employment_status_check" CHECK (((employment_status)::text = ANY (ARRAY[('full_time'::character varying)::text, ('part_time'::character varying)::text, ('self_employed'::character varying)::text, ('contract'::character varying)::text, ('student'::character varying)::text, ('retired'::character varying)::text, ('unemployed'::character varying)::text]))) not valid;

alter table "public"."loans" validate constraint "loans_employment_status_check";

alter table "public"."loans" add constraint "loans_estimated_monthly_payment_check" CHECK ((estimated_monthly_payment >= (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_estimated_monthly_payment_check";

alter table "public"."loans" add constraint "loans_existing_credit_debt_check" CHECK ((existing_credit_debt >= (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_existing_credit_debt_check";

alter table "public"."loans" add constraint "loans_monthly_housing_payment_check" CHECK ((monthly_housing_payment >= (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_monthly_housing_payment_check";

alter table "public"."loans" add constraint "loans_monthly_income_check" CHECK ((monthly_income > (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_monthly_income_check";

alter table "public"."loans" add constraint "loans_outstanding_principal_check" CHECK ((outstanding_principal >= (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_outstanding_principal_check";

alter table "public"."loans" add constraint "loans_principal_amount_check" CHECK ((principal_amount > (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_principal_amount_check";

alter table "public"."loans" add constraint "loans_recommended_decision_check" CHECK (((recommended_decision)::text = ANY (ARRAY[('approve'::character varying)::text, ('review'::character varying)::text, ('decline'::character varying)::text]))) not valid;

alter table "public"."loans" validate constraint "loans_recommended_decision_check";

alter table "public"."loans" add constraint "loans_risk_score_check" CHECK (((risk_score >= 0) AND (risk_score <= 100))) not valid;

alter table "public"."loans" validate constraint "loans_risk_score_check";

alter table "public"."loans" add constraint "loans_risk_tier_check" CHECK (((risk_tier)::text = ANY (ARRAY[('good'::character varying)::text, ('review'::character varying)::text, ('bad'::character varying)::text]))) not valid;

alter table "public"."loans" validate constraint "loans_risk_tier_check";

alter table "public"."loans" add constraint "loans_status_check" CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('active'::character varying)::text, ('rejected'::character varying)::text, ('paid'::character varying)::text]))) not valid;

alter table "public"."loans" validate constraint "loans_status_check";

alter table "public"."loans" add constraint "loans_term_months_check" CHECK (((term_months >= 6) AND (term_months <= 84))) not valid;

alter table "public"."loans" validate constraint "loans_term_months_check";

alter table "public"."loans" add constraint "loans_total_interest_charged_check" CHECK ((total_interest_charged >= (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_total_interest_charged_check";

alter table "public"."loans" add constraint "loans_total_paid_check" CHECK ((total_paid >= (0)::numeric)) not valid;

alter table "public"."loans" validate constraint "loans_total_paid_check";

alter table "public"."savings_monthly_activity" add constraint "savings_monthly_activity_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE not valid;

alter table "public"."savings_monthly_activity" validate constraint "savings_monthly_activity_account_id_fkey";

alter table "public"."savings_monthly_activity" add constraint "savings_monthly_activity_interest_credited_amount_check" CHECK ((interest_credited_amount >= (0)::numeric)) not valid;

alter table "public"."savings_monthly_activity" validate constraint "savings_monthly_activity_interest_credited_amount_check";

alter table "public"."savings_monthly_activity" add constraint "savings_monthly_activity_opening_balance_check" CHECK ((opening_balance >= (0)::numeric)) not valid;

alter table "public"."savings_monthly_activity" validate constraint "savings_monthly_activity_opening_balance_check";

alter table "public"."savings_monthly_activity" add constraint "savings_monthly_activity_withdrawal_cap_amount_check" CHECK ((withdrawal_cap_amount >= (0)::numeric)) not valid;

alter table "public"."savings_monthly_activity" validate constraint "savings_monthly_activity_withdrawal_cap_amount_check";

alter table "public"."savings_monthly_activity" add constraint "savings_monthly_activity_withdrawn_amount_check" CHECK ((withdrawn_amount >= (0)::numeric)) not valid;

alter table "public"."savings_monthly_activity" validate constraint "savings_monthly_activity_withdrawn_amount_check";

alter table "public"."bill_schedules" add constraint "bill_schedules_frequency_check" CHECK (((frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'bi-weekly'::character varying, 'monthly'::character varying, 'quarterly'::character varying, 'annually'::character varying])::text[]))) not valid;

alter table "public"."bill_schedules" validate constraint "bill_schedules_frequency_check";

alter table "public"."bill_schedules" add constraint "bill_schedules_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[]))) not valid;

alter table "public"."bill_schedules" validate constraint "bill_schedules_status_check";

alter table "public"."payment_executions" add constraint "payment_executions_status_check" CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'retrying'::character varying, 'skipped_insufficient_funds'::character varying])::text[]))) not valid;

alter table "public"."payment_executions" validate constraint "payment_executions_status_check";

alter table "public"."transactions" add constraint "transactions_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'reversed'::character varying])::text[]))) not valid;

alter table "public"."transactions" validate constraint "transactions_status_check";

alter table "public"."transactions" add constraint "transactions_transaction_type_check" CHECK (((transaction_type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'transfer'::character varying, 'fee'::character varying, 'interest'::character varying, 'bill_payment'::character varying, 'cashbox_send'::character varying, 'cashbox_withdraw'::character varying, 'credit_purchase'::character varying, 'loan_payment'::character varying, 'credit_payment'::character varying, 'loan_disbursement'::character varying])::text[]))) not valid;

alter table "public"."transactions" validate constraint "transactions_transaction_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.ensure_credit_account_parent_is_credit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_loan_parent_account_is_checking()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_savings_monthly_activity_parent_is_saving()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

grant delete on table "public"."bank_income" to "anon";

grant insert on table "public"."bank_income" to "anon";

grant references on table "public"."bank_income" to "anon";

grant select on table "public"."bank_income" to "anon";

grant trigger on table "public"."bank_income" to "anon";

grant truncate on table "public"."bank_income" to "anon";

grant update on table "public"."bank_income" to "anon";

grant delete on table "public"."bank_income" to "authenticated";

grant insert on table "public"."bank_income" to "authenticated";

grant references on table "public"."bank_income" to "authenticated";

grant select on table "public"."bank_income" to "authenticated";

grant trigger on table "public"."bank_income" to "authenticated";

grant truncate on table "public"."bank_income" to "authenticated";

grant update on table "public"."bank_income" to "authenticated";

grant delete on table "public"."bank_income" to "service_role";

grant insert on table "public"."bank_income" to "service_role";

grant references on table "public"."bank_income" to "service_role";

grant select on table "public"."bank_income" to "service_role";

grant trigger on table "public"."bank_income" to "service_role";

grant truncate on table "public"."bank_income" to "service_role";

grant update on table "public"."bank_income" to "service_role";

grant delete on table "public"."cheque_deposits" to "anon";

grant insert on table "public"."cheque_deposits" to "anon";

grant references on table "public"."cheque_deposits" to "anon";

grant select on table "public"."cheque_deposits" to "anon";

grant trigger on table "public"."cheque_deposits" to "anon";

grant truncate on table "public"."cheque_deposits" to "anon";

grant update on table "public"."cheque_deposits" to "anon";

grant delete on table "public"."cheque_deposits" to "authenticated";

grant insert on table "public"."cheque_deposits" to "authenticated";

grant references on table "public"."cheque_deposits" to "authenticated";

grant select on table "public"."cheque_deposits" to "authenticated";

grant trigger on table "public"."cheque_deposits" to "authenticated";

grant truncate on table "public"."cheque_deposits" to "authenticated";

grant update on table "public"."cheque_deposits" to "authenticated";

grant delete on table "public"."cheque_deposits" to "service_role";

grant insert on table "public"."cheque_deposits" to "service_role";

grant references on table "public"."cheque_deposits" to "service_role";

grant select on table "public"."cheque_deposits" to "service_role";

grant trigger on table "public"."cheque_deposits" to "service_role";

grant truncate on table "public"."cheque_deposits" to "service_role";

grant update on table "public"."cheque_deposits" to "service_role";

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


  create policy "Allow admins to read all bank income"
  on "public"."bank_income"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Customers can update own bill schedules"
  on "public"."bill_schedules"
  as permissive
  for update
  to public
using ((account_id IN ( SELECT accounts.account_id
   FROM public.accounts
  WHERE (accounts.customer_id = ( SELECT customers.customer_id
           FROM public.customers
          WHERE (customers.user_id = auth.uid()))))));



  create policy "Customers can view own cheque deposits"
  on "public"."cheque_deposits"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (((public.transactions t
     JOIN public.accounts a ON ((t.destination_account_id = a.account_id)))
     JOIN public.customers c ON ((a.customer_id = c.customer_id)))
     JOIN public.users u ON ((c.user_id = u.user_id)))
  WHERE ((t.transaction_id = cheque_deposits.transaction_id) AND (u.user_id = auth.uid())))));



  create policy "Managers and admins can view all cheque deposits"
  on "public"."cheque_deposits"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND ((users.role = 'manager'::public.role) OR (users.role = 'admin'::public.role))))));



  create policy "Allow admins to read all credit accounts"
  on "public"."credit_accounts"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Users can insert their own credit accounts"
  on "public"."credit_accounts"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (public.accounts
     JOIN public.customers ON ((customers.customer_id = accounts.customer_id)))
  WHERE ((accounts.account_id = credit_accounts.account_id) AND (customers.user_id = auth.uid())))));



  create policy "Users can update their own credit accounts"
  on "public"."credit_accounts"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.accounts
     JOIN public.customers ON ((customers.customer_id = accounts.customer_id)))
  WHERE ((accounts.account_id = credit_accounts.account_id) AND (customers.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM (public.accounts
     JOIN public.customers ON ((customers.customer_id = accounts.customer_id)))
  WHERE ((accounts.account_id = credit_accounts.account_id) AND (customers.user_id = auth.uid())))));



  create policy "Users can view their own credit accounts"
  on "public"."credit_accounts"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.accounts
     JOIN public.customers ON ((customers.customer_id = accounts.customer_id)))
  WHERE ((accounts.account_id = credit_accounts.account_id) AND (customers.user_id = auth.uid())))));



  create policy "Allow admins to read all credit cards"
  on "public"."credit_cards"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Users can manage their own credit cards"
  on "public"."credit_cards"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.accounts
     JOIN public.customers ON ((customers.customer_id = accounts.customer_id)))
  WHERE ((accounts.account_id = credit_cards.account_id) AND (customers.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM (public.accounts
     JOIN public.customers ON ((customers.customer_id = accounts.customer_id)))
  WHERE ((accounts.account_id = credit_cards.account_id) AND (customers.user_id = auth.uid())))));



  create policy "Allow admins to read all loans"
  on "public"."loans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Allow admins to update all loans"
  on "public"."loans"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))))
with check ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Users can insert their own loans"
  on "public"."loans"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.customers
  WHERE ((customers.customer_id = loans.customer_id) AND (customers.user_id = auth.uid())))));



  create policy "Users can update their own loans"
  on "public"."loans"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.customers
  WHERE ((customers.customer_id = loans.customer_id) AND (customers.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.customers
  WHERE ((customers.customer_id = loans.customer_id) AND (customers.user_id = auth.uid())))));



  create policy "Users can view their own loans"
  on "public"."loans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.customers
  WHERE ((customers.customer_id = loans.customer_id) AND (customers.user_id = auth.uid())))));



  create policy "Customers can view own payment executions"
  on "public"."payment_executions"
  as permissive
  for select
  to public
using ((schedule_id IN ( SELECT bill_schedules.schedule_id
   FROM public.bill_schedules
  WHERE (bill_schedules.account_id IN ( SELECT accounts.account_id
           FROM public.accounts
          WHERE (accounts.customer_id = ( SELECT customers.customer_id
                   FROM public.customers
                  WHERE (customers.user_id = auth.uid()))))))));



  create policy "Allow admins to read all savings monthly activity"
  on "public"."savings_monthly_activity"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Users can manage their own savings monthly activity"
  on "public"."savings_monthly_activity"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.accounts
     JOIN public.customers ON ((customers.customer_id = accounts.customer_id)))
  WHERE ((accounts.account_id = savings_monthly_activity.account_id) AND (customers.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM (public.accounts
     JOIN public.customers ON ((customers.customer_id = accounts.customer_id)))
  WHERE ((accounts.account_id = savings_monthly_activity.account_id) AND (customers.user_id = auth.uid())))));


CREATE TRIGGER trg_credit_accounts_validate_parent BEFORE INSERT OR UPDATE ON public.credit_accounts FOR EACH ROW EXECUTE FUNCTION public.ensure_credit_account_parent_is_credit();

CREATE TRIGGER trg_loans_validate_checking_parent BEFORE INSERT OR UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.ensure_loan_parent_account_is_checking();

CREATE TRIGGER trg_savings_monthly_activity_validate_parent BEFORE INSERT OR UPDATE ON public.savings_monthly_activity FOR EACH ROW EXECUTE FUNCTION public.ensure_savings_monthly_activity_parent_is_saving();


  create policy "Authenticated users can upload cheques ca7ib6_0"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'cheques'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Customers can view own cheques ca7ib6_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'cheques'::text) AND (((storage.foldername(name))[1] = ( SELECT (c.customer_id)::text AS customer_id
   FROM public.customers c
  WHERE (c.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = ANY (ARRAY['manager'::public.role, 'admin'::public.role]))))))));



