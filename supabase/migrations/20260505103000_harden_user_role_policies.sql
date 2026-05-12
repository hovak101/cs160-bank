drop policy if exists "Allow admin read users" on public.users;
drop policy if exists "Users can update own row" on public.users;
drop policy if exists "Users can update own user row" on public.users;
drop policy if exists "admin can update users" on public.users;

create policy "Admins can read all users"
on public.users
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

create policy "Admins can update users"
on public.users
for update
to authenticated
using (
  exists (
    select 1
    from public.users as actor
    where actor.user_id = auth.uid()
      and actor.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users as actor
    where actor.user_id = auth.uid()
      and actor.role = 'admin'
  )
);
