import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import {
  CREDIT_REWARDS_RATE,
  computeSavingsWithdrawalCap,
  getMonthKey,
  roundCurrency,
} from "@/lib/banking/rules";

type TypedSupabase = SupabaseClient<Database>;
type SavingsMonthlyActivity = Tables<"savings_monthly_activity">;

export function getCustomerDisplayName(customer: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  const fullName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Cardholder";
}

export function buildCreditCardSeed(cardholderName: string) {
  const randomDigits = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 10).toString()
  ).join("");
  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 4);

  return {
    cardholder_name: cardholderName,
    card_brand: "Visa",
    card_last4: randomDigits.slice(-4),
    card_status: "active",
    rewards_program: "Cash Back",
    rewards_rate: CREDIT_REWARDS_RATE,
    exp_month: expDate.getMonth() + 1,
    exp_year: expDate.getFullYear(),
  };
}

export async function getOrCreateSavingsMonthlyActivity(
  supabase: TypedSupabase,
  accountId: string,
  openingBalance: number,
  now = new Date()
) {
  const monthKey = getMonthKey(now);
  const { data: existing, error: existingError } = await supabase
    .from("savings_monthly_activity")
    .select("*")
    .eq("account_id", accountId)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from("savings_monthly_activity")
    .insert({
      account_id: accountId,
      month_key: monthKey,
      opening_balance: roundCurrency(openingBalance),
      withdrawal_cap_amount: computeSavingsWithdrawalCap(openingBalance),
      withdrawn_amount: 0,
      interest_credited_amount: 0,
    })
    .select("*")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || "Failed to create savings monthly activity.");
  }

  return created;
}

export function getRemainingSavingsWithdrawalAllowance(
  activity: Pick<SavingsMonthlyActivity, "withdrawal_cap_amount" | "withdrawn_amount">
) {
  return roundCurrency(
    Math.max(
      Number(activity.withdrawal_cap_amount || 0) - Number(activity.withdrawn_amount || 0),
      0
    )
  );
}
