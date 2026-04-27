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
  "updated_at" timestamp without time zone not null default now(),
  constraint "bank_income_pkey" primary key ("income_id"),
  constraint "bank_income_source_transaction_id_key" unique ("source_transaction_id"),
  constraint "bank_income_source_transaction_id_fkey"
    foreign key ("source_transaction_id")
    references "public"."transactions"("transaction_id")
    on delete cascade,
  constraint "bank_income_source_account_id_fkey"
    foreign key ("source_account_id")
    references "public"."accounts"("account_id")
    on delete set null,
  constraint "bank_income_category_check"
    check ((income_category)::text = any ((array['fee'::character varying, 'interest_charge'::character varying])::text[])),
  constraint "bank_income_amount_check" check (amount >= 0)
);

create index "bank_income_recognized_at_idx"
  on "public"."bank_income" using btree ("recognized_at");

create index "bank_income_category_idx"
  on "public"."bank_income" using btree ("income_category");

alter table "public"."bank_income" enable row level security;

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

create policy "Allow admins to read all bank income"
on "public"."bank_income"
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

insert into "public"."bank_income" (
  "source_transaction_id",
  "source_account_id",
  "reference_number",
  "income_category",
  "amount",
  "description",
  "recognized_at"
)
select
  t."transaction_id",
  t."source_account_id",
  t."reference_number",
  case
    when lower(coalesce(t."transaction_type"::text, '')) = 'fee' then 'fee'
    else 'interest_charge'
  end,
  t."amount",
  t."description",
  coalesce(t."executed_at", now())
from "public"."transactions" t
where lower(coalesce(t."status"::text, '')) = 'completed'
  and (
    lower(coalesce(t."transaction_type"::text, '')) = 'fee'
    or (
      lower(coalesce(t."transaction_type"::text, '')) = 'interest'
      and lower(coalesce(t."description", '')) like '%charge%'
      and lower(coalesce(t."description", '')) not like '%credit%'
    )
  )
on conflict ("source_transaction_id") do nothing;
