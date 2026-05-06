create or replace function public.create_cashbox_for_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cashboxes (customer_id, balance)
  values (new.customer_id, 0)
  on conflict (customer_id) do nothing;

  return new;
end;
$$;

drop policy if exists "Allow authenticated update accounts" on public.accounts;
drop policy if exists "Customer can create own account" on public.accounts;
drop policy if exists "Customer can update own account" on public.accounts;

drop policy if exists "Allow authenticated users to read transactions" on public.transactions;
drop policy if exists "Allow insert for authenticated users" on public.transactions;
drop policy if exists "Allow authenticated update transactions" on public.transactions;

drop policy if exists "Allow lookup by phone number" on public.customers;
drop policy if exists "Customers can insert own row" on public.customers;
drop policy if exists "Customers can update own row" on public.customers;
drop policy if exists "Customers can update own bill schedules" on public.bill_schedules;

drop policy if exists "Users can insert their own cashbox" on public.cashboxes;
drop policy if exists "Users can update their own cashbox" on public.cashboxes;

drop policy if exists "Users can insert their own credit accounts" on public.credit_accounts;
drop policy if exists "Users can update their own credit accounts" on public.credit_accounts;
drop policy if exists "Users can manage their own credit cards" on public.credit_cards;

drop policy if exists "Users can manage their own savings monthly activity" on public.savings_monthly_activity;

drop policy if exists "Users can insert their own loans" on public.loans;
drop policy if exists "Users can update their own loans" on public.loans;

drop policy if exists "Customers can insert own ATM simulations" on public.atm_simulations;
drop policy if exists "Customers can update own ATM simulations" on public.atm_simulations;

create policy "Admins can read all transactions"
on public.transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.users as actor
    where actor.user_id = auth.uid()
      and actor.role = 'admin'
  )
);

create policy "Customers can view own transactions"
on public.transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts as a
    join public.customers as c
      on c.customer_id = a.customer_id
    where c.user_id = auth.uid()
      and (
        a.account_id = public.transactions.source_account_id
        or a.account_id = public.transactions.destination_account_id
      )
  )
  or (
    public.transactions.transaction_type = 'cashbox_send'
    and exists (
      select 1
      from public.customers as c
      where c.user_id = auth.uid()
        and regexp_replace(coalesce(c.phone_number, ''), '\D', '', 'g') <> ''
        and coalesce(public.transactions.description, '') ilike (
          '%' || regexp_replace(coalesce(c.phone_number, ''), '\D', '', 'g') || '%'
        )
    )
  )
);

create policy "Users can view their own credit cards"
on public.credit_cards
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    join public.customers
      on public.customers.customer_id = public.accounts.customer_id
    where public.accounts.account_id = public.credit_cards.account_id
      and public.customers.user_id = auth.uid()
  )
);

create policy "Users can view their own savings monthly activity"
on public.savings_monthly_activity
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    join public.customers
      on public.customers.customer_id = public.accounts.customer_id
    where public.accounts.account_id = public.savings_monthly_activity.account_id
      and public.customers.user_id = auth.uid()
  )
);
