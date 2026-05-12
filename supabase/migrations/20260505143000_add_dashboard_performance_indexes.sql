create index if not exists accounts_customer_created_at_idx
on public.accounts (customer_id, created_at desc);

create index if not exists transactions_source_account_executed_at_idx
on public.transactions (source_account_id, executed_at desc)
where source_account_id is not null;

create index if not exists transactions_destination_account_executed_at_idx
on public.transactions (destination_account_id, executed_at desc)
where destination_account_id is not null;

create index if not exists transactions_type_executed_at_idx
on public.transactions (transaction_type, executed_at desc);
