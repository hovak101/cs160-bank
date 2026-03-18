


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
    'checking'
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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "account_id" "uuid" NOT NULL,
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


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "customer_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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


CREATE TABLE IF NOT EXISTS "public"."managers" (
    "manager_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "first_name" character varying,
    "last_name" character varying,
    "employee_id" character varying,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."managers" OWNER TO "postgres";


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
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('customer'::character varying)::"text", ('manager'::character varying)::"text", ('admin'::character varying)::"text", ('auditor'::character varying)::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_account_number_key" UNIQUE ("account_number");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("account_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."managers"
    ADD CONSTRAINT "managers_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."managers"
    ADD CONSTRAINT "managers_pkey" PRIMARY KEY ("manager_id");



ALTER TABLE ONLY "public"."managers"
    ADD CONSTRAINT "managers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "fk_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id");



ALTER TABLE ONLY "public"."managers"
    ADD CONSTRAINT "managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



CREATE POLICY "Customers can update own row" ON "public"."customers" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Customers can view own row" ON "public"."customers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Managers can update own row" ON "public"."managers" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Managers can view own row" ON "public"."managers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own user row" ON "public"."users" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own user row" ON "public"."users" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."managers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."managers" TO "anon";
GRANT ALL ON TABLE "public"."managers" TO "authenticated";
GRANT ALL ON TABLE "public"."managers" TO "service_role";



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

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


