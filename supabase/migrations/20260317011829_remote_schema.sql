alter table "public"."accounts" enable row level security;


  create policy "Customer can create own account"
  on "public"."accounts"
  as permissive
  for insert
  to public
with check ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.user_id = auth.uid()))));



  create policy "Customer can update own account"
  on "public"."accounts"
  as permissive
  for update
  to public
using ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.user_id = auth.uid()))))
with check ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.user_id = auth.uid()))));



  create policy "Customer can view own accounts"
  on "public"."accounts"
  as permissive
  for select
  to public
using ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.user_id = auth.uid()))));



