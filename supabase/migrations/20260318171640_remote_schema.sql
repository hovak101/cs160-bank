drop policy "Customers can update own row" on "public"."customers";

drop policy "Customers can view own row" on "public"."customers";

alter type "public"."account_type" rename to "account_type__old_version_to_be_dropped";

create type "public"."account_type" as enum ('credit', 'checking', 'saving');


  create table "public"."bill_schedules" (
    "schedule_id" uuid not null default gen_random_uuid(),
    "account_id" uuid,
    "payee_id" uuid,
    "nickname" character varying,
    "amount" numeric(15,2),
    "currency" character varying default 'USD'::character varying,
    "frequency" character varying,
    "start_date" date,
    "end_date" date,
    "next_payment_date" date,
    "status" character varying default 'active'::character varying,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."bill_schedules" enable row level security;


  create table "public"."payment_executions" (
    "execution_id" uuid not null default gen_random_uuid(),
    "schedule_id" uuid,
    "transaction_id" uuid,
    "scheduled_date" date,
    "actual_execution_at" timestamp without time zone,
    "status" character varying,
    "failure_reason" text,
    "retry_count" integer default 0
      );


alter table "public"."payment_executions" enable row level security;


  create table "public"."transactions" (
    "transaction_id" uuid not null default gen_random_uuid(),
    "reference_number" character varying not null,
    "source_account_id" uuid,
    "destination_account_id" uuid,
    "amount" numeric(15,2) not null,
    "transaction_type" character varying,
    "status" character varying default 'pending'::character varying,
    "description" text,
    "executed_at" timestamp without time zone default now()
      );


alter table "public"."transactions" enable row level security;

alter table "public"."accounts" alter column account_type type "public"."account_type" using account_type::text::"public"."account_type";

drop type "public"."account_type__old_version_to_be_dropped";

alter table "public"."customers" alter column "customer_id" set default gen_random_uuid();

CREATE UNIQUE INDEX accounts_account_id_unique ON public.accounts USING btree (account_id);

CREATE UNIQUE INDEX bill_schedules_pkey ON public.bill_schedules USING btree (schedule_id);

CREATE UNIQUE INDEX bill_schedules_schedule_id_key ON public.bill_schedules USING btree (schedule_id);

CREATE UNIQUE INDEX payment_executions_execution_id_key ON public.payment_executions USING btree (execution_id);

CREATE UNIQUE INDEX payment_executions_pkey ON public.payment_executions USING btree (execution_id);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (transaction_id);

CREATE UNIQUE INDEX transactions_reference_number_key ON public.transactions USING btree (reference_number);

CREATE UNIQUE INDEX transactions_transaction_id_key ON public.transactions USING btree (transaction_id);

alter table "public"."bill_schedules" add constraint "bill_schedules_pkey" PRIMARY KEY using index "bill_schedules_pkey";

alter table "public"."payment_executions" add constraint "payment_executions_pkey" PRIMARY KEY using index "payment_executions_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."accounts" add constraint "accounts_account_id_unique" UNIQUE using index "accounts_account_id_unique";

alter table "public"."bill_schedules" add constraint "bill_schedules_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) not valid;

alter table "public"."bill_schedules" validate constraint "bill_schedules_account_id_fkey";

alter table "public"."bill_schedules" add constraint "bill_schedules_frequency_check" CHECK (((frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'bi-weekly'::character varying, 'monthly'::character varying, 'quarterly'::character varying, 'annually'::character varying])::text[]))) not valid;

alter table "public"."bill_schedules" validate constraint "bill_schedules_frequency_check";

alter table "public"."bill_schedules" add constraint "bill_schedules_schedule_id_key" UNIQUE using index "bill_schedules_schedule_id_key";

alter table "public"."bill_schedules" add constraint "bill_schedules_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[]))) not valid;

alter table "public"."bill_schedules" validate constraint "bill_schedules_status_check";

alter table "public"."payment_executions" add constraint "payment_executions_execution_id_key" UNIQUE using index "payment_executions_execution_id_key";

alter table "public"."payment_executions" add constraint "payment_executions_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES public.bill_schedules(schedule_id) not valid;

alter table "public"."payment_executions" validate constraint "payment_executions_schedule_id_fkey";

alter table "public"."payment_executions" add constraint "payment_executions_status_check" CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'retrying'::character varying, 'skipped_insufficient_funds'::character varying])::text[]))) not valid;

alter table "public"."payment_executions" validate constraint "payment_executions_status_check";

alter table "public"."payment_executions" add constraint "payment_executions_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.transactions(transaction_id) not valid;

alter table "public"."payment_executions" validate constraint "payment_executions_transaction_id_fkey";

alter table "public"."transactions" add constraint "transactions_destination_account_id_fkey" FOREIGN KEY (destination_account_id) REFERENCES public.accounts(account_id) not valid;

alter table "public"."transactions" validate constraint "transactions_destination_account_id_fkey";

alter table "public"."transactions" add constraint "transactions_reference_number_key" UNIQUE using index "transactions_reference_number_key";

alter table "public"."transactions" add constraint "transactions_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.accounts(account_id) not valid;

alter table "public"."transactions" validate constraint "transactions_source_account_id_fkey";

alter table "public"."transactions" add constraint "transactions_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'reversed'::character varying])::text[]))) not valid;

alter table "public"."transactions" validate constraint "transactions_status_check";

alter table "public"."transactions" add constraint "transactions_transaction_id_key" UNIQUE using index "transactions_transaction_id_key";

alter table "public"."transactions" add constraint "transactions_transaction_type_check" CHECK (((transaction_type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'transfer'::character varying, 'fee'::character varying, 'interest'::character varying])::text[]))) not valid;

alter table "public"."transactions" validate constraint "transactions_transaction_type_check";

grant delete on table "public"."bill_schedules" to "anon";

grant insert on table "public"."bill_schedules" to "anon";

grant references on table "public"."bill_schedules" to "anon";

grant select on table "public"."bill_schedules" to "anon";

grant trigger on table "public"."bill_schedules" to "anon";

grant truncate on table "public"."bill_schedules" to "anon";

grant update on table "public"."bill_schedules" to "anon";

grant delete on table "public"."bill_schedules" to "authenticated";

grant insert on table "public"."bill_schedules" to "authenticated";

grant references on table "public"."bill_schedules" to "authenticated";

grant select on table "public"."bill_schedules" to "authenticated";

grant trigger on table "public"."bill_schedules" to "authenticated";

grant truncate on table "public"."bill_schedules" to "authenticated";

grant update on table "public"."bill_schedules" to "authenticated";

grant delete on table "public"."bill_schedules" to "service_role";

grant insert on table "public"."bill_schedules" to "service_role";

grant references on table "public"."bill_schedules" to "service_role";

grant select on table "public"."bill_schedules" to "service_role";

grant trigger on table "public"."bill_schedules" to "service_role";

grant truncate on table "public"."bill_schedules" to "service_role";

grant update on table "public"."bill_schedules" to "service_role";

grant delete on table "public"."payment_executions" to "anon";

grant insert on table "public"."payment_executions" to "anon";

grant references on table "public"."payment_executions" to "anon";

grant select on table "public"."payment_executions" to "anon";

grant trigger on table "public"."payment_executions" to "anon";

grant truncate on table "public"."payment_executions" to "anon";

grant update on table "public"."payment_executions" to "anon";

grant delete on table "public"."payment_executions" to "authenticated";

grant insert on table "public"."payment_executions" to "authenticated";

grant references on table "public"."payment_executions" to "authenticated";

grant select on table "public"."payment_executions" to "authenticated";

grant trigger on table "public"."payment_executions" to "authenticated";

grant truncate on table "public"."payment_executions" to "authenticated";

grant update on table "public"."payment_executions" to "authenticated";

grant delete on table "public"."payment_executions" to "service_role";

grant insert on table "public"."payment_executions" to "service_role";

grant references on table "public"."payment_executions" to "service_role";

grant select on table "public"."payment_executions" to "service_role";

grant trigger on table "public"."payment_executions" to "service_role";

grant truncate on table "public"."payment_executions" to "service_role";

grant update on table "public"."payment_executions" to "service_role";

grant delete on table "public"."transactions" to "anon";

grant insert on table "public"."transactions" to "anon";

grant references on table "public"."transactions" to "anon";

grant select on table "public"."transactions" to "anon";

grant trigger on table "public"."transactions" to "anon";

grant truncate on table "public"."transactions" to "anon";

grant update on table "public"."transactions" to "anon";

grant delete on table "public"."transactions" to "authenticated";

grant insert on table "public"."transactions" to "authenticated";

grant references on table "public"."transactions" to "authenticated";

grant select on table "public"."transactions" to "authenticated";

grant trigger on table "public"."transactions" to "authenticated";

grant truncate on table "public"."transactions" to "authenticated";

grant update on table "public"."transactions" to "authenticated";

grant delete on table "public"."transactions" to "service_role";

grant insert on table "public"."transactions" to "service_role";

grant references on table "public"."transactions" to "service_role";

grant select on table "public"."transactions" to "service_role";

grant trigger on table "public"."transactions" to "service_role";

grant truncate on table "public"."transactions" to "service_role";

grant update on table "public"."transactions" to "service_role";


  create policy "Customers can insert own row"
  on "public"."customers"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can insert own row"
  on "public"."users"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can update own row"
  on "public"."users"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can view own row"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Customers can update own row"
  on "public"."customers"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id));



  create policy "Customers can view own row"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



