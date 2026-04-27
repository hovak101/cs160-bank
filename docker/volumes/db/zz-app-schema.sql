


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';


-- Self-hosted Supabase doesn't pre-create the 'graphql' schema; cloud does.
CREATE SCHEMA IF NOT EXISTS "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."account_status" AS ENUM (
    'active',
    'frozen',
    'closed'
);


ALTER TYPE "public"."account_status" OWNER TO "postgres";


CREATE TYPE "public"."account_type" AS ENUM (
    'credit',
    'checking',
    'saving'
);


ALTER TYPE "public"."account_type" OWNER TO "postgres";


CREATE TYPE "public"."billschedule_status" AS ENUM (
    'active',
    'paused',
    'cancelled',
    'completed'
);


ALTER TYPE "public"."billschedule_status" OWNER TO "postgres";


CREATE TYPE "public"."checkdeposit_status" AS ENUM (
    'submitted',
    'pending_review',
    'cleared',
    'bounced'
);


ALTER TYPE "public"."checkdeposit_status" OWNER TO "postgres";


CREATE TYPE "public"."frequency" AS ENUM (
    'once',
    'weekly',
    'biweekly',
    'monthly',
    'annually'
);


ALTER TYPE "public"."frequency" OWNER TO "postgres";


CREATE TYPE "public"."kyc_status" AS ENUM (
    'pending',
    'verified',
    'rejected'
);


ALTER TYPE "public"."kyc_status" OWNER TO "postgres";


CREATE TYPE "public"."paymentexecution_status" AS ENUM (
    'success',
    'failed',
    'retrying',
    'skipped_insufficient_funds'
);


ALTER TYPE "public"."paymentexecution_status" OWNER TO "postgres";


CREATE TYPE "public"."role" AS ENUM (
    'customer',
    'manager',
    'admin',
    'auditor'
);


ALTER TYPE "public"."role" OWNER TO "postgres";


CREATE TYPE "public"."transaction_status" AS ENUM (
    'pending',
    'completed',
    'failed',
    'reversed'
);


ALTER TYPE "public"."transaction_status" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type" AS ENUM (
    'deposit',
    'withdrawal',
    'transfer',
    'fee',
    'interest'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_cashbox_for_new_customer"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into cashboxes (customer_id, balance)
  values (new.customer_id, 0)
  on conflict (customer_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."create_cashbox_for_new_customer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_credit_account_parent_is_credit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."ensure_credit_account_parent_is_credit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_loan_parent_account_is_checking"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."ensure_loan_parent_account_is_checking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_savings_monthly_activity_parent_is_saving"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."ensure_savings_monthly_activity_parent_is_saving"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role public.role;
BEGIN
  v_role := COALESCE(
    (new.raw_user_meta_data->>'role')::public.role,
    'customer'
  );

  INSERT INTO public.users (user_id, email, role, is_active, mfa_enabled, failed_login_attempts, created_at)
  VALUES (new.id, new.email, v_role, true, false, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  IF v_role = 'customer' THEN
    INSERT INTO public.customers (
      user_id, first_name, last_name, phone_number, tax_id,
      country, kyc_status, created_at
    )
    VALUES (
      new.id,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'phone_number',
      new.raw_user_meta_data->>'tax_id',
      'USA', 'pending', now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'manager' THEN
    INSERT INTO public.managers (user_id, first_name, last_name, employee_id, created_at)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'employee_id',
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "account_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "account_name" character varying(100) NOT NULL,
    "account_number" character varying(50) NOT NULL,
    "account_type" "public"."account_type" NOT NULL,
    "balance" numeric(15,2) DEFAULT 0.00 NOT NULL,
    "currency" character varying(10) NOT NULL,
    "status" "public"."account_status" DEFAULT 'active'::"public"."account_status" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_income" (
    "income_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_transaction_id" "uuid" NOT NULL,
    "source_account_id" "uuid",
    "reference_number" "text",
    "income_category" character varying(50) NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "description" "text",
    "recognized_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bank_income_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "bank_income_category_check" CHECK ((("income_category")::"text" = ANY (ARRAY[('fee'::character varying)::"text", ('interest_charge'::character varying)::"text"])))
);


ALTER TABLE "public"."bank_income" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bill_schedules" (
    "schedule_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid",
    "payee_id" "uuid",
    "nickname" character varying,
    "amount" numeric(15,2),
    "currency" character varying DEFAULT 'USD'::character varying,
    "frequency" character varying,
    "start_date" "date",
    "end_date" "date",
    "next_payment_date" "date",
    "status" character varying DEFAULT 'active'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "bill_schedules_frequency_check" CHECK ((("frequency")::"text" = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'bi-weekly'::character varying, 'monthly'::character varying, 'quarterly'::character varying, 'annually'::character varying])::"text"[]))),
    CONSTRAINT "bill_schedules_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'cancelled'::character varying, 'completed'::character varying])::"text"[])))
);


ALTER TABLE "public"."bill_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cashboxes" (
    "cashbox_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "balance" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cashboxes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cheque_deposits" (
    "cheque_deposit_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cheque_deposits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_accounts" (
    "account_id" "uuid" NOT NULL,
    "credit_limit" numeric(15,2) NOT NULL,
    "current_balance" numeric(15,2) DEFAULT 0 NOT NULL,
    "available_credit" numeric(15,2) GENERATED ALWAYS AS (GREATEST(("credit_limit" - "current_balance"), (0)::numeric)) STORED,
    "statement_balance" numeric(15,2) DEFAULT 0 NOT NULL,
    "minimum_payment_due" numeric(15,2) DEFAULT 0 NOT NULL,
    "apr" numeric(5,2) DEFAULT 0 NOT NULL,
    "last_statement_at" timestamp without time zone,
    "next_statement_at" timestamp without time zone,
    "payment_due_at" timestamp without time zone,
    "last_payment_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "purchase_apr" numeric(5,2) DEFAULT 24.99 NOT NULL,
    "cash_advance_apr" numeric(5,2) DEFAULT 29.99 NOT NULL,
    "cash_advance_limit" numeric(15,2) DEFAULT 0 NOT NULL,
    "cash_advance_balance" numeric(15,2) DEFAULT 0 NOT NULL,
    "late_fee_amount" numeric(15,2) DEFAULT 35 NOT NULL,
    "rewards_points" numeric(15,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "credit_accounts_apr_check" CHECK ((("apr" >= (0)::numeric) AND ("apr" <= (100)::numeric))),
    CONSTRAINT "credit_accounts_cash_advance_apr_check" CHECK ((("cash_advance_apr" >= (0)::numeric) AND ("cash_advance_apr" <= (100)::numeric))),
    CONSTRAINT "credit_accounts_cash_advance_balance_check" CHECK (("cash_advance_balance" >= (0)::numeric)),
    CONSTRAINT "credit_accounts_cash_advance_limit_check" CHECK (("cash_advance_limit" >= (0)::numeric)),
    CONSTRAINT "credit_accounts_credit_limit_check" CHECK (("credit_limit" >= (0)::numeric)),
    CONSTRAINT "credit_accounts_current_balance_check" CHECK (("current_balance" >= (0)::numeric)),
    CONSTRAINT "credit_accounts_late_fee_amount_check" CHECK (("late_fee_amount" >= (0)::numeric)),
    CONSTRAINT "credit_accounts_minimum_payment_due_check" CHECK (("minimum_payment_due" >= (0)::numeric)),
    CONSTRAINT "credit_accounts_purchase_apr_check" CHECK ((("purchase_apr" >= (0)::numeric) AND ("purchase_apr" <= (100)::numeric))),
    CONSTRAINT "credit_accounts_rewards_points_check" CHECK (("rewards_points" >= (0)::numeric)),
    CONSTRAINT "credit_accounts_statement_balance_check" CHECK (("statement_balance" >= (0)::numeric))
);


ALTER TABLE "public"."credit_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_cards" (
    "card_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "cardholder_name" "text" NOT NULL,
    "card_brand" character varying(50) DEFAULT 'Visa'::character varying NOT NULL,
    "card_last4" character varying(4) NOT NULL,
    "card_status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "rewards_program" character varying(100) DEFAULT 'Cash Back'::character varying NOT NULL,
    "rewards_rate" numeric(6,4) DEFAULT 0.015 NOT NULL,
    "exp_month" integer NOT NULL,
    "exp_year" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credit_cards_card_status_check" CHECK ((("card_status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('locked'::character varying)::"text", ('expired'::character varying)::"text"]))),
    CONSTRAINT "credit_cards_exp_month_check" CHECK ((("exp_month" >= 1) AND ("exp_month" <= 12))),
    CONSTRAINT "credit_cards_rewards_rate_check" CHECK (("rewards_rate" >= (0)::numeric))
);


ALTER TABLE "public"."credit_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "customer_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "first_name" character varying,
    "last_name" character varying,
    "phone_number" character varying,
    "tax_id" character varying,
    "country" character varying DEFAULT 'USA'::character varying,
    "kyc_status" "public"."kyc_status" DEFAULT 'pending'::"public"."kyc_status",
    "address_line_1" character varying,
    "address_line_2" character varying,
    "city" character varying,
    "state" character varying,
    "zip_code" character varying,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loans" (
    "loan_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "checking_account_id" "uuid" NOT NULL,
    "principal_amount" numeric(15,2) NOT NULL,
    "term_months" integer NOT NULL,
    "annual_interest_rate" numeric(5,2) NOT NULL,
    "monthly_income" numeric(15,2) NOT NULL,
    "monthly_housing_payment" numeric(15,2) DEFAULT 0 NOT NULL,
    "existing_credit_debt" numeric(15,2) DEFAULT 0 NOT NULL,
    "employment_status" character varying(30) NOT NULL,
    "purpose" "text",
    "other_financial_notes" "text",
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "risk_score" integer DEFAULT 0 NOT NULL,
    "risk_tier" character varying(20) DEFAULT 'bad'::character varying NOT NULL,
    "recommended_decision" character varying(20) DEFAULT 'decline'::character varying NOT NULL,
    "risk_summary" "text",
    "debt_to_income_ratio" numeric(8,4) DEFAULT 0 NOT NULL,
    "estimated_monthly_payment" numeric(15,2) DEFAULT 0 NOT NULL,
    "outstanding_principal" numeric(15,2) DEFAULT 0 NOT NULL,
    "accrued_interest" numeric(15,2) DEFAULT 0 NOT NULL,
    "total_interest_charged" numeric(15,2) DEFAULT 0 NOT NULL,
    "total_paid" numeric(15,2) DEFAULT 0 NOT NULL,
    "reviewed_by_user_id" "uuid",
    "admin_decision_notes" "text",
    "reviewed_at" timestamp without time zone,
    "disbursed_at" timestamp without time zone,
    "last_interest_accrued_at" timestamp without time zone,
    "last_payment_at" timestamp without time zone,
    "paid_off_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "loans_accrued_interest_check" CHECK (("accrued_interest" >= (0)::numeric)),
    CONSTRAINT "loans_annual_interest_rate_check" CHECK ((("annual_interest_rate" >= (0)::numeric) AND ("annual_interest_rate" <= (100)::numeric))),
    CONSTRAINT "loans_debt_to_income_ratio_check" CHECK (("debt_to_income_ratio" >= (0)::numeric)),
    CONSTRAINT "loans_employment_status_check" CHECK ((("employment_status")::"text" = ANY (ARRAY[('full_time'::character varying)::"text", ('part_time'::character varying)::"text", ('self_employed'::character varying)::"text", ('contract'::character varying)::"text", ('student'::character varying)::"text", ('retired'::character varying)::"text", ('unemployed'::character varying)::"text"]))),
    CONSTRAINT "loans_estimated_monthly_payment_check" CHECK (("estimated_monthly_payment" >= (0)::numeric)),
    CONSTRAINT "loans_existing_credit_debt_check" CHECK (("existing_credit_debt" >= (0)::numeric)),
    CONSTRAINT "loans_monthly_housing_payment_check" CHECK (("monthly_housing_payment" >= (0)::numeric)),
    CONSTRAINT "loans_monthly_income_check" CHECK (("monthly_income" > (0)::numeric)),
    CONSTRAINT "loans_outstanding_principal_check" CHECK (("outstanding_principal" >= (0)::numeric)),
    CONSTRAINT "loans_principal_amount_check" CHECK (("principal_amount" > (0)::numeric)),
    CONSTRAINT "loans_recommended_decision_check" CHECK ((("recommended_decision")::"text" = ANY (ARRAY[('approve'::character varying)::"text", ('review'::character varying)::"text", ('decline'::character varying)::"text"]))),
    CONSTRAINT "loans_risk_score_check" CHECK ((("risk_score" >= 0) AND ("risk_score" <= 100))),
    CONSTRAINT "loans_risk_tier_check" CHECK ((("risk_tier")::"text" = ANY (ARRAY[('good'::character varying)::"text", ('review'::character varying)::"text", ('bad'::character varying)::"text"]))),
    CONSTRAINT "loans_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('active'::character varying)::"text", ('rejected'::character varying)::"text", ('paid'::character varying)::"text"]))),
    CONSTRAINT "loans_term_months_check" CHECK ((("term_months" >= 6) AND ("term_months" <= 84))),
    CONSTRAINT "loans_total_interest_charged_check" CHECK (("total_interest_charged" >= (0)::numeric)),
    CONSTRAINT "loans_total_paid_check" CHECK (("total_paid" >= (0)::numeric))
);


ALTER TABLE "public"."loans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."managers" (
    "manager_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "first_name" character varying,
    "last_name" character varying,
    "employee_id" character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."managers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_executions" (
    "execution_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_id" "uuid",
    "transaction_id" "uuid",
    "scheduled_date" "date",
    "actual_execution_at" timestamp without time zone,
    "status" character varying,
    "failure_reason" "text",
    "retry_count" integer DEFAULT 0,
    CONSTRAINT "payment_executions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'retrying'::character varying, 'skipped_insufficient_funds'::character varying])::"text"[])))
);


ALTER TABLE "public"."payment_executions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."savings_monthly_activity" (
    "account_id" "uuid" NOT NULL,
    "month_key" "date" NOT NULL,
    "opening_balance" numeric(15,2) NOT NULL,
    "withdrawal_cap_amount" numeric(15,2) NOT NULL,
    "withdrawn_amount" numeric(15,2) DEFAULT 0 NOT NULL,
    "interest_credited_amount" numeric(15,2) DEFAULT 0 NOT NULL,
    "interest_credited_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "savings_monthly_activity_interest_credited_amount_check" CHECK (("interest_credited_amount" >= (0)::numeric)),
    CONSTRAINT "savings_monthly_activity_opening_balance_check" CHECK (("opening_balance" >= (0)::numeric)),
    CONSTRAINT "savings_monthly_activity_withdrawal_cap_amount_check" CHECK (("withdrawal_cap_amount" >= (0)::numeric)),
    CONSTRAINT "savings_monthly_activity_withdrawn_amount_check" CHECK (("withdrawn_amount" >= (0)::numeric))
);


ALTER TABLE "public"."savings_monthly_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "transaction_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference_number" character varying NOT NULL,
    "source_account_id" "uuid",
    "destination_account_id" "uuid",
    "amount" numeric(15,2) NOT NULL,
    "transaction_type" character varying,
    "status" character varying DEFAULT 'pending'::character varying,
    "description" "text",
    "executed_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "transactions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'reversed'::character varying])::"text"[]))),
    CONSTRAINT "transactions_transaction_type_check" CHECK ((("transaction_type")::"text" = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'transfer'::character varying, 'fee'::character varying, 'interest'::character varying, 'bill_payment'::character varying, 'cashbox_send'::character varying, 'cashbox_withdraw'::character varying, 'credit_purchase'::character varying, 'loan_payment'::character varying, 'credit_payment'::character varying, 'loan_disbursement'::character varying])::"text"[])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "user_id" "uuid" NOT NULL,
    "email" character varying NOT NULL,
    "role" "public"."role",
    "is_active" boolean DEFAULT true,
    "mfa_enabled" boolean DEFAULT false,
    "failed_login_attempts" integer DEFAULT 0,
    "account_locked_until" timestamp without time zone,
    "last_login_at" timestamp without time zone,
    "password_changed_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "deactivation_reason" "text",
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('customer'::character varying)::"text", ('manager'::character varying)::"text", ('admin'::character varying)::"text", ('auditor'::character varying)::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_account_id_unique" UNIQUE ("account_id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("account_id");



ALTER TABLE ONLY "public"."bank_income"
    ADD CONSTRAINT "bank_income_pkey" PRIMARY KEY ("income_id");



ALTER TABLE ONLY "public"."bank_income"
    ADD CONSTRAINT "bank_income_source_transaction_id_key" UNIQUE ("source_transaction_id");



ALTER TABLE ONLY "public"."bill_schedules"
    ADD CONSTRAINT "bill_schedules_pkey" PRIMARY KEY ("schedule_id");



ALTER TABLE ONLY "public"."bill_schedules"
    ADD CONSTRAINT "bill_schedules_schedule_id_key" UNIQUE ("schedule_id");



ALTER TABLE ONLY "public"."cashboxes"
    ADD CONSTRAINT "cashboxes_customer_id_key" UNIQUE ("customer_id");



ALTER TABLE ONLY "public"."cashboxes"
    ADD CONSTRAINT "cashboxes_pkey" PRIMARY KEY ("cashbox_id");



ALTER TABLE ONLY "public"."cheque_deposits"
    ADD CONSTRAINT "cheque_deposits_pkey" PRIMARY KEY ("cheque_deposit_id");



ALTER TABLE ONLY "public"."credit_accounts"
    ADD CONSTRAINT "credit_accounts_pkey" PRIMARY KEY ("account_id");



ALTER TABLE ONLY "public"."credit_cards"
    ADD CONSTRAINT "credit_cards_account_id_key" UNIQUE ("account_id");



ALTER TABLE ONLY "public"."credit_cards"
    ADD CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("card_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."loans"
    ADD CONSTRAINT "loans_pkey" PRIMARY KEY ("loan_id");



ALTER TABLE ONLY "public"."managers"
    ADD CONSTRAINT "managers_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."managers"
    ADD CONSTRAINT "managers_pkey" PRIMARY KEY ("manager_id");



ALTER TABLE ONLY "public"."managers"
    ADD CONSTRAINT "managers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."payment_executions"
    ADD CONSTRAINT "payment_executions_execution_id_key" UNIQUE ("execution_id");



ALTER TABLE ONLY "public"."payment_executions"
    ADD CONSTRAINT "payment_executions_pkey" PRIMARY KEY ("execution_id");



ALTER TABLE ONLY "public"."savings_monthly_activity"
    ADD CONSTRAINT "savings_monthly_activity_pkey" PRIMARY KEY ("account_id", "month_key");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_reference_number_key" UNIQUE ("reference_number");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_transaction_id_key" UNIQUE ("transaction_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "bank_income_category_idx" ON "public"."bank_income" USING "btree" ("income_category");



CREATE INDEX "bank_income_recognized_at_idx" ON "public"."bank_income" USING "btree" ("recognized_at");



CREATE INDEX "cheque_deposits_transaction_id_idx" ON "public"."cheque_deposits" USING "btree" ("transaction_id");



CREATE INDEX "credit_accounts_next_statement_at_idx" ON "public"."credit_accounts" USING "btree" ("next_statement_at");



CREATE INDEX "credit_accounts_payment_due_at_idx" ON "public"."credit_accounts" USING "btree" ("payment_due_at");



CREATE INDEX "loans_created_at_idx" ON "public"."loans" USING "btree" ("created_at" DESC);



CREATE INDEX "loans_customer_id_idx" ON "public"."loans" USING "btree" ("customer_id");



CREATE INDEX "loans_status_idx" ON "public"."loans" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "trg_create_cashbox_for_customer" AFTER INSERT ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."create_cashbox_for_new_customer"();



CREATE OR REPLACE TRIGGER "trg_credit_accounts_validate_parent" BEFORE INSERT OR UPDATE ON "public"."credit_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_credit_account_parent_is_credit"();



CREATE OR REPLACE TRIGGER "trg_loans_validate_checking_parent" BEFORE INSERT OR UPDATE ON "public"."loans" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_loan_parent_account_is_checking"();



CREATE OR REPLACE TRIGGER "trg_savings_monthly_activity_validate_parent" BEFORE INSERT OR UPDATE ON "public"."savings_monthly_activity" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_savings_monthly_activity_parent_is_saving"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."bank_income"
    ADD CONSTRAINT "bank_income_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "public"."accounts"("account_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bank_income"
    ADD CONSTRAINT "bank_income_source_transaction_id_fkey" FOREIGN KEY ("source_transaction_id") REFERENCES "public"."transactions"("transaction_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_schedules"
    ADD CONSTRAINT "bill_schedules_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id");



ALTER TABLE ONLY "public"."cashboxes"
    ADD CONSTRAINT "cashboxes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id");



ALTER TABLE ONLY "public"."cheque_deposits"
    ADD CONSTRAINT "cheque_deposits_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("transaction_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_accounts"
    ADD CONSTRAINT "credit_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_cards"
    ADD CONSTRAINT "credit_cards_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("account_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loans"
    ADD CONSTRAINT "loans_checking_account_id_fkey" FOREIGN KEY ("checking_account_id") REFERENCES "public"."accounts"("account_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."loans"
    ADD CONSTRAINT "loans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."managers"
    ADD CONSTRAINT "managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_executions"
    ADD CONSTRAINT "payment_executions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."bill_schedules"("schedule_id");



ALTER TABLE ONLY "public"."payment_executions"
    ADD CONSTRAINT "payment_executions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("transaction_id");



ALTER TABLE ONLY "public"."savings_monthly_activity"
    ADD CONSTRAINT "savings_monthly_activity_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "public"."accounts"("account_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "public"."accounts"("account_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can insert into user table" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "users_1"
  WHERE (("users_1"."user_id" = "auth"."uid"()) AND ("users_1"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admin read users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow admin to edit all rows" ON "public"."managers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to insert on table" ON "public"."managers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to read all bank income" ON "public"."bank_income" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to read all credit accounts" ON "public"."credit_accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to read all credit cards" ON "public"."credit_cards" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to read all loans" ON "public"."loans" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to read all rows" ON "public"."accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to read all rows" ON "public"."customers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to read all rows" ON "public"."managers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to read all savings monthly activity" ON "public"."savings_monthly_activity" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow admins to update all loans" ON "public"."loans" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."role")))));



CREATE POLICY "Allow authenticated update accounts" ON "public"."accounts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow insert for authenticated users" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow lookup by phone number" ON "public"."customers" FOR SELECT USING (true);



CREATE POLICY "Allow managers to read all rows" ON "public"."accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'manager'::"public"."role")))));



CREATE POLICY "Allow managers to read all rows" ON "public"."customers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'manager'::"public"."role")))));



CREATE POLICY "Allow managers to read all rows" ON "public"."transactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'manager'::"public"."role")))));



CREATE POLICY "Customer can create own account" ON "public"."accounts" FOR INSERT WITH CHECK (("customer_id" IN ( SELECT "customers"."customer_id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customer can update own account" ON "public"."accounts" FOR UPDATE USING (("customer_id" IN ( SELECT "customers"."customer_id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"())))) WITH CHECK (("customer_id" IN ( SELECT "customers"."customer_id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customer can view own accounts" ON "public"."accounts" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."customer_id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers can insert own row" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Customers can update own bill schedules" ON "public"."bill_schedules" FOR UPDATE USING (("account_id" IN ( SELECT "accounts"."account_id"
   FROM "public"."accounts"
  WHERE ("accounts"."customer_id" = ( SELECT "customers"."customer_id"
           FROM "public"."customers"
          WHERE ("customers"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Customers can update own row" ON "public"."customers" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Customers can view own cheque deposits" ON "public"."cheque_deposits" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."transactions" "t"
     JOIN "public"."accounts" "a" ON (("t"."destination_account_id" = "a"."account_id")))
     JOIN "public"."customers" "c" ON (("a"."customer_id" = "c"."customer_id")))
     JOIN "public"."users" "u" ON (("c"."user_id" = "u"."user_id")))
  WHERE (("t"."transaction_id" = "cheque_deposits"."transaction_id") AND ("u"."user_id" = "auth"."uid"())))));



CREATE POLICY "Customers can view own payment executions" ON "public"."payment_executions" FOR SELECT USING (("schedule_id" IN ( SELECT "bill_schedules"."schedule_id"
   FROM "public"."bill_schedules"
  WHERE ("bill_schedules"."account_id" IN ( SELECT "accounts"."account_id"
           FROM "public"."accounts"
          WHERE ("accounts"."customer_id" = ( SELECT "customers"."customer_id"
                   FROM "public"."customers"
                  WHERE ("customers"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "Customers can view own row" ON "public"."customers" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Managers and admins can view all cheque deposits" ON "public"."cheque_deposits" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND (("users"."role" = 'manager'::"public"."role") OR ("users"."role" = 'admin'::"public"."role"))))));



CREATE POLICY "Managers can update own row" ON "public"."managers" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Managers can view own row" ON "public"."managers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own row" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own cashbox" ON "public"."cashboxes" FOR INSERT WITH CHECK (("customer_id" IN ( SELECT "customers"."customer_id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own credit accounts" ON "public"."credit_accounts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."accounts"
     JOIN "public"."customers" ON (("customers"."customer_id" = "accounts"."customer_id")))
  WHERE (("accounts"."account_id" = "credit_accounts"."account_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own loans" ON "public"."loans" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."customer_id" = "loans"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own credit cards" ON "public"."credit_cards" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."accounts"
     JOIN "public"."customers" ON (("customers"."customer_id" = "accounts"."customer_id")))
  WHERE (("accounts"."account_id" = "credit_cards"."account_id") AND ("customers"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."accounts"
     JOIN "public"."customers" ON (("customers"."customer_id" = "accounts"."customer_id")))
  WHERE (("accounts"."account_id" = "credit_cards"."account_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own savings monthly activity" ON "public"."savings_monthly_activity" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."accounts"
     JOIN "public"."customers" ON (("customers"."customer_id" = "accounts"."customer_id")))
  WHERE (("accounts"."account_id" = "savings_monthly_activity"."account_id") AND ("customers"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."accounts"
     JOIN "public"."customers" ON (("customers"."customer_id" = "accounts"."customer_id")))
  WHERE (("accounts"."account_id" = "savings_monthly_activity"."account_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own row" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own user row" ON "public"."users" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own cashbox" ON "public"."cashboxes" FOR UPDATE USING (("customer_id" IN ( SELECT "customers"."customer_id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"())))) WITH CHECK (("customer_id" IN ( SELECT "customers"."customer_id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own credit accounts" ON "public"."credit_accounts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."accounts"
     JOIN "public"."customers" ON (("customers"."customer_id" = "accounts"."customer_id")))
  WHERE (("accounts"."account_id" = "credit_accounts"."account_id") AND ("customers"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."accounts"
     JOIN "public"."customers" ON (("customers"."customer_id" = "accounts"."customer_id")))
  WHERE (("accounts"."account_id" = "credit_accounts"."account_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own loans" ON "public"."loans" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."customer_id" = "loans"."customer_id") AND ("customers"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."customer_id" = "loans"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own row" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own user row" ON "public"."users" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own cashbox" ON "public"."cashboxes" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."customer_id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own credit accounts" ON "public"."credit_accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."accounts"
     JOIN "public"."customers" ON (("customers"."customer_id" = "accounts"."customer_id")))
  WHERE (("accounts"."account_id" = "credit_accounts"."account_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own loans" ON "public"."loans" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."customer_id" = "loans"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin can update users" ON "public"."users" FOR UPDATE USING (true) WITH CHECK (true);



ALTER TABLE "public"."bank_income" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cashboxes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."managers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_executions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."savings_monthly_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_cashbox_for_new_customer"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_cashbox_for_new_customer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_cashbox_for_new_customer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_credit_account_parent_is_credit"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_credit_account_parent_is_credit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_credit_account_parent_is_credit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_loan_parent_account_is_checking"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_loan_parent_account_is_checking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_loan_parent_account_is_checking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_savings_monthly_activity_parent_is_saving"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_savings_monthly_activity_parent_is_saving"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_savings_monthly_activity_parent_is_saving"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."bank_income" TO "anon";
GRANT ALL ON TABLE "public"."bank_income" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_income" TO "service_role";



GRANT ALL ON TABLE "public"."bill_schedules" TO "anon";
GRANT ALL ON TABLE "public"."bill_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."cashboxes" TO "anon";
GRANT ALL ON TABLE "public"."cashboxes" TO "authenticated";
GRANT ALL ON TABLE "public"."cashboxes" TO "service_role";



GRANT ALL ON TABLE "public"."cheque_deposits" TO "anon";
GRANT ALL ON TABLE "public"."cheque_deposits" TO "authenticated";
GRANT ALL ON TABLE "public"."cheque_deposits" TO "service_role";



GRANT ALL ON TABLE "public"."credit_accounts" TO "anon";
GRANT ALL ON TABLE "public"."credit_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."credit_cards" TO "anon";
GRANT ALL ON TABLE "public"."credit_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_cards" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."loans" TO "anon";
GRANT ALL ON TABLE "public"."loans" TO "authenticated";
GRANT ALL ON TABLE "public"."loans" TO "service_role";



GRANT ALL ON TABLE "public"."managers" TO "anon";
GRANT ALL ON TABLE "public"."managers" TO "authenticated";
GRANT ALL ON TABLE "public"."managers" TO "service_role";



GRANT ALL ON TABLE "public"."payment_executions" TO "anon";
GRANT ALL ON TABLE "public"."payment_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_executions" TO "service_role";



GRANT ALL ON TABLE "public"."savings_monthly_activity" TO "anon";
GRANT ALL ON TABLE "public"."savings_monthly_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."savings_monthly_activity" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";

alter table "public"."bill_schedules" drop constraint "bill_schedules_frequency_check";

alter table "public"."bill_schedules" drop constraint "bill_schedules_status_check";

alter table "public"."payment_executions" drop constraint "payment_executions_status_check";

alter table "public"."transactions" drop constraint "transactions_status_check";

alter table "public"."transactions" drop constraint "transactions_transaction_type_check";

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

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


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





-- ============================================================================
-- Post-snapshot migrations (appended for the Docker self-host bundle).
-- These run after the remote_schema dump above so the local Postgres has
-- the same final state as the cloud DB.
-- ============================================================================


-- ----- 20260424130000_add_plaid_linked_accounts.sql -----
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

-- ----- 20260424174500_reapply_credit_card_security_code_columns.sql -----
create extension if not exists pgcrypto;

alter table "public"."credit_cards"
  add column if not exists "security_code_hash" text,
  add column if not exists "security_code_last_updated_at" timestamp without time zone default now(),
  add column if not exists "security_code_mode" character varying(20) not null default 'user_set';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'credit_cards_security_code_mode_check'
  ) then
    alter table "public"."credit_cards"
      add constraint "credit_cards_security_code_mode_check"
      check (
        (security_code_mode)::text = any (
          (array['user_set'::character varying, 'legacy_demo'::character varying])::text[]
        )
      );
  end if;
end
$$;

-- ----- 20260425093000_add_atm_simulations.sql -----
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

-- ----- 20260425124500_fix_atm_transaction_updates.sql -----
drop policy if exists "Allow authenticated update transactions"
on "public"."transactions";

create policy "Allow authenticated update transactions"
on "public"."transactions"
for update
to authenticated
using (true)
with check (true);

update "public"."transactions" as t
set
  "status" = case
    when s."status" = 'completed' then 'completed'
    when s."status" = 'failed' then 'failed'
    else t."status"
  end,
  "executed_at" = coalesce(s."completed_at", t."executed_at"),
  "description" = case
    when s."status" = 'completed' then
      (
        case
          when s."action" = 'withdraw' then 'ATM withdrawal at '
          else 'ATM deposit at '
        end
      ) || s."atm_name" || ' - ' || s."atm_location"
    when s."status" = 'failed' then
      (
        case
          when s."action" = 'withdraw' then 'Cancelled ATM withdrawal at '
          else 'Cancelled ATM deposit at '
        end
      ) || s."atm_name" || ' - ' || s."atm_location"
    else t."description"
  end
from "public"."atm_simulations" as s
where
  t."transaction_id" = s."transaction_id"
  and t."transaction_type" in ('atm_withdrawal', 'atm_deposit')
  and (
    (s."status" = 'completed' and coalesce(t."status", 'pending') <> 'completed')
    or (s."status" = 'failed' and coalesce(t."status", 'pending') <> 'failed')
  );

-- 20260427120000_create_cheques_bucket.sql
insert into storage.buckets (id, name, public)
values ('cheques', 'cheques', false)
on conflict (id) do nothing;
