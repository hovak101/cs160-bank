create or replace function public.current_user_role()
returns public.role
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.role;
begin
  select u.role
  into current_role
  from public.users as u
  where u.user_id = auth.uid()
  limit 1;

  return current_role;
end;
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_role() to service_role;

drop policy if exists "Admins can read all users" on public.users;
drop policy if exists "Admins can update users" on public.users;

create policy "Admins can read all users"
on public.users
for select
to authenticated
using (public.current_user_role() = 'admin');

create policy "Admins can update users"
on public.users
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
