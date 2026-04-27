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
