create extension if not exists pgcrypto;

alter table "public"."credit_cards"
  add column if not exists "security_code_hash" text,
  add column if not exists "security_code_last_updated_at" timestamp without time zone default now(),
  add column if not exists "security_code_mode" character varying(20) not null default 'user_set',
  add constraint "credit_cards_security_code_mode_check"
    check (
      (security_code_mode)::text = any (
        (array['user_set'::character varying, 'legacy_demo'::character varying])::text[]
      )
    );

update "public"."credit_cards"
set
  "security_code_hash" = 'sha256:' || encode(digest(right(card_last4, 3), 'sha256'), 'hex'),
  "security_code_last_updated_at" = coalesce("updated_at", now()),
  "security_code_mode" = 'legacy_demo'
where coalesce("security_code_hash", '') = '';

alter table "public"."credit_cards"
  alter column "security_code_hash" set not null,
  alter column "security_code_last_updated_at" set not null;
