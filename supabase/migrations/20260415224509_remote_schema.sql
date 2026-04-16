alter table "public"."bill_schedules" drop constraint "bill_schedules_frequency_check";

alter table "public"."bill_schedules" drop constraint "bill_schedules_status_check";

alter table "public"."payment_executions" drop constraint "payment_executions_status_check";

alter table "public"."transactions" drop constraint "transactions_status_check";

alter table "public"."transactions" drop constraint "transactions_transaction_type_check";


  create table "public"."cashboxes" (
    "cashbox_id" uuid not null default gen_random_uuid(),
    "customer_id" uuid not null,
    "balance" numeric(12,2) not null default 0,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );


alter table "public"."cashboxes" enable row level security;

alter table "public"."managers" add column "is_active" boolean not null default true;

alter table "public"."users" add column "deactivation_reason" text;

CREATE UNIQUE INDEX cashboxes_customer_id_key ON public.cashboxes USING btree (customer_id);

CREATE UNIQUE INDEX cashboxes_pkey ON public.cashboxes USING btree (cashbox_id);

alter table "public"."cashboxes" add constraint "cashboxes_pkey" PRIMARY KEY using index "cashboxes_pkey";

alter table "public"."cashboxes" add constraint "cashboxes_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) not valid;

alter table "public"."cashboxes" validate constraint "cashboxes_customer_id_fkey";

alter table "public"."cashboxes" add constraint "cashboxes_customer_id_key" UNIQUE using index "cashboxes_customer_id_key";

alter table "public"."bill_schedules" add constraint "bill_schedules_frequency_check" CHECK (((frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'bi-weekly'::character varying, 'monthly'::character varying, 'quarterly'::character varying, 'annually'::character varying])::text[]))) not valid;

alter table "public"."bill_schedules" validate constraint "bill_schedules_frequency_check";

alter table "public"."bill_schedules" add constraint "bill_schedules_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[]))) not valid;

alter table "public"."bill_schedules" validate constraint "bill_schedules_status_check";

alter table "public"."payment_executions" add constraint "payment_executions_status_check" CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'retrying'::character varying, 'skipped_insufficient_funds'::character varying])::text[]))) not valid;

alter table "public"."payment_executions" validate constraint "payment_executions_status_check";

alter table "public"."transactions" add constraint "transactions_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'reversed'::character varying])::text[]))) not valid;

alter table "public"."transactions" validate constraint "transactions_status_check";

alter table "public"."transactions" add constraint "transactions_transaction_type_check" CHECK (((transaction_type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'transfer'::character varying, 'bill_payment'::character varying, 'cashbox_send'::character varying, 'cashbox_withdraw'::character varying])::text[]))) not valid;

alter table "public"."transactions" validate constraint "transactions_transaction_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_cashbox_for_new_customer()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  insert into cashboxes (customer_id, balance)
  values (new.customer_id, 0)
  on conflict (customer_id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
$function$
;

grant delete on table "public"."cashboxes" to "anon";

grant insert on table "public"."cashboxes" to "anon";

grant references on table "public"."cashboxes" to "anon";

grant select on table "public"."cashboxes" to "anon";

grant trigger on table "public"."cashboxes" to "anon";

grant truncate on table "public"."cashboxes" to "anon";

grant update on table "public"."cashboxes" to "anon";

grant delete on table "public"."cashboxes" to "authenticated";

grant insert on table "public"."cashboxes" to "authenticated";

grant references on table "public"."cashboxes" to "authenticated";

grant select on table "public"."cashboxes" to "authenticated";

grant trigger on table "public"."cashboxes" to "authenticated";

grant truncate on table "public"."cashboxes" to "authenticated";

grant update on table "public"."cashboxes" to "authenticated";

grant delete on table "public"."cashboxes" to "service_role";

grant insert on table "public"."cashboxes" to "service_role";

grant references on table "public"."cashboxes" to "service_role";

grant select on table "public"."cashboxes" to "service_role";

grant trigger on table "public"."cashboxes" to "service_role";

grant truncate on table "public"."cashboxes" to "service_role";

grant update on table "public"."cashboxes" to "service_role";


  create policy "Allow admins to read all rows"
  on "public"."accounts"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Allow authenticated update accounts"
  on "public"."accounts"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Users can insert their own cashbox"
  on "public"."cashboxes"
  as permissive
  for insert
  to public
with check ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.user_id = auth.uid()))));



  create policy "Users can update their own cashbox"
  on "public"."cashboxes"
  as permissive
  for update
  to public
using ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.user_id = auth.uid()))))
with check ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.user_id = auth.uid()))));



  create policy "Users can view their own cashbox"
  on "public"."cashboxes"
  as permissive
  for select
  to public
using ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.user_id = auth.uid()))));



  create policy "Allow admins to read all rows"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Allow lookup by phone number"
  on "public"."customers"
  as permissive
  for select
  to public
using (true);



  create policy "Allow admin to edit all rows"
  on "public"."managers"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))))
with check ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Allow admins to insert on table"
  on "public"."managers"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Allow admins to read all rows"
  on "public"."managers"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'admin'::public.role)))));



  create policy "Admin can insert into user table"
  on "public"."users"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users users_1
  WHERE ((users_1.user_id = auth.uid()) AND (users_1.role = 'admin'::public.role)))));



  create policy "Allow admin read users"
  on "public"."users"
  as permissive
  for select
  to public
using (true);



  create policy "admin can update users"
  on "public"."users"
  as permissive
  for update
  to public
using (true)
with check (true);


CREATE TRIGGER trg_create_cashbox_for_customer AFTER INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.create_cashbox_for_new_customer();


