import type { Tables } from "@/lib/supabase/database.types";
import { supabaseAdmin } from "@/lib/supabase/admin";

type CashboxRow = Pick<Tables<"cashboxes">, "cashbox_id" | "balance">;

export async function getOrCreateCashboxForCustomer(
  customerId: string
): Promise<CashboxRow> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("cashboxes")
    .select("cashbox_id, balance")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || "Failed to load CashBox.");
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("cashboxes")
    .insert({
      customer_id: customerId,
      balance: 0,
    })
    .select("cashbox_id, balance")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || "Failed to create CashBox.");
  }

  return created;
}
