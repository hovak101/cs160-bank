drop policy if exists "Allow authenticated update transactions"
on "public"."transactions";

create policy "Allow authenticated update transactions"
on "public"."transactions"
for update
to authenticated
using (true)
with check (true);

update "public"."transactions" as t
set
  "status" = case
    when s."status" = 'completed' then 'completed'
    when s."status" = 'failed' then 'failed'
    else t."status"
  end,
  "executed_at" = coalesce(s."completed_at", t."executed_at"),
  "description" = case
    when s."status" = 'completed' then
      (
        case
          when s."action" = 'withdraw' then 'ATM withdrawal at '
          else 'ATM deposit at '
        end
      ) || s."atm_name" || ' - ' || s."atm_location"
    when s."status" = 'failed' then
      (
        case
          when s."action" = 'withdraw' then 'Cancelled ATM withdrawal at '
          else 'Cancelled ATM deposit at '
        end
      ) || s."atm_name" || ' - ' || s."atm_location"
    else t."description"
  end
from "public"."atm_simulations" as s
where
  t."transaction_id" = s."transaction_id"
  and t."transaction_type" in ('atm_withdrawal', 'atm_deposit')
  and (
    (s."status" = 'completed' and coalesce(t."status", 'pending') <> 'completed')
    or (s."status" = 'failed' and coalesce(t."status", 'pending') <> 'failed')
  );
