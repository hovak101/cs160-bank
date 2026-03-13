


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
    AS $$
begin

insert into public.users (user_id, email, role, is_active)
values (new.id, new.email, 'customer', true);

insert into public.customers (user_id, country)
values (new.id, 'USA');

return new;

end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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


ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can update own user row" ON "public"."users" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own user row" ON "public"."users" FOR SELECT USING (("user_id" = "auth"."uid"()));



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


