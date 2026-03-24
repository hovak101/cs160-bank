alter table "public"."bill_schedules" drop constraint "bill_schedules_frequency_check";

alter table "public"."bill_schedules" drop constraint "bill_schedules_status_check";

alter table "public"."payment_executions" drop constraint "payment_executions_status_check";

alter table "public"."transactions" drop constraint "transactions_status_check";

alter table "public"."transactions" drop constraint "transactions_transaction_type_check";

CREATE UNIQUE INDEX accounts_pkey ON public.accounts USING btree (account_id);

alter table "public"."accounts" add constraint "accounts_pkey" PRIMARY KEY using index "accounts_pkey";

alter table "public"."accounts" add constraint "accounts_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON UPDATE CASCADE not valid;

alter table "public"."accounts" validate constraint "accounts_customer_id_fkey";

alter table "public"."bill_schedules" add constraint "bill_schedules_frequency_check" CHECK (((frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'bi-weekly'::character varying, 'monthly'::character varying, 'quarterly'::character varying, 'annually'::character varying])::text[]))) not valid;

alter table "public"."bill_schedules" validate constraint "bill_schedules_frequency_check";

alter table "public"."bill_schedules" add constraint "bill_schedules_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[]))) not valid;

alter table "public"."bill_schedules" validate constraint "bill_schedules_status_check";

alter table "public"."payment_executions" add constraint "payment_executions_status_check" CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'retrying'::character varying, 'skipped_insufficient_funds'::character varying])::text[]))) not valid;

alter table "public"."payment_executions" validate constraint "payment_executions_status_check";

alter table "public"."transactions" add constraint "transactions_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'reversed'::character varying])::text[]))) not valid;

alter table "public"."transactions" validate constraint "transactions_status_check";

alter table "public"."transactions" add constraint "transactions_transaction_type_check" CHECK (((transaction_type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'transfer'::character varying, 'fee'::character varying, 'interest'::character varying])::text[]))) not valid;

alter table "public"."transactions" validate constraint "transactions_transaction_type_check";


  create policy "Allow managers to read all rows"
  on "public"."accounts"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'manager'::public.role)))));



  create policy "Allow managers to read all rows"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'manager'::public.role)))));



  create policy "Allow authenticated users to read transactions"
  on "public"."transactions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow insert for authenticated users"
  on "public"."transactions"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow managers to read all rows"
  on "public"."transactions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = auth.uid()) AND (users.role = 'manager'::public.role)))));



