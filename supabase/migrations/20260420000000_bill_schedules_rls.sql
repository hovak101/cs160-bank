-- RLS policies for bill_schedules

-- Customers can view their own schedules (source account belongs to them)
create policy "Customers can view own bill schedules"
  on public.bill_schedules
  for select
  using (
    account_id in (
      select a.account_id
      from public.accounts a
      join public.customers c on c.customer_id = a.customer_id
      where c.user_id = auth.uid()
    )
  );

-- Customers can create schedules on their own accounts
create policy "Customers can insert own bill schedules"
  on public.bill_schedules
  for insert
  with check (
    account_id in (
      select a.account_id
      from public.accounts a
      join public.customers c on c.customer_id = a.customer_id
      where c.user_id = auth.uid()
    )
  );

-- Customers can cancel (update status) their own schedules
create policy "Customers can update own bill schedules"
  on public.bill_schedules
  for update
  using (
    account_id in (
      select a.account_id
      from public.accounts a
      join public.customers c on c.customer_id = a.customer_id
      where c.user_id = auth.uid()
    )
  );

-- RLS policies for payment_executions

-- Customers can view executions for their own schedules
create policy "Customers can view own payment executions"
  on public.payment_executions
  for select
  using (
    schedule_id in (
      select bs.schedule_id
      from public.bill_schedules bs
      join public.accounts a on a.account_id = bs.account_id
      join public.customers c on c.customer_id = a.customer_id
      where c.user_id = auth.uid()
    )
  );
