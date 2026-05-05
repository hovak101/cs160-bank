import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CashboxSendForm from "@/components/customer/cashbox-send-form";
import { isDepositEligible } from "@/lib/banking/rules";
import type { Tables } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

type CashboxRow = Pick<Tables<"cashboxes">, "cashbox_id" | "balance">;

export default async function CashBoxSendPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer) redirect("/auth/onboarding");

  const { data: accountsData } = await supabase
    .from("accounts")
    .select(
      "account_id, account_name, account_number, account_type, balance, currency, status"
    )
    .eq("customer_id", customer.customer_id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const accounts: Account[] = (accountsData ?? []).map((account) => ({
    account_id: account.account_id,
    account_name: account.account_name ?? "",
    account_number: account.account_number ?? "",
    account_type: account.account_type ?? "",
    balance: Number(account.balance ?? 0),
    currency: account.currency ?? "USD",
    status: account.status ?? "unknown",
  }));

  const eligibleAccounts = accounts.filter((account) =>
    isDepositEligible(account.account_type)
  );

  const { data: cashboxData } = await supabase
    .from("cashboxes")
    .select("cashbox_id, balance")
    .eq("customer_id", customer.customer_id)
    .maybeSingle();

  let cashbox = cashboxData as CashboxRow | null;

  if (!cashbox) {
    const { data: createdCashbox, error: createCashboxError } = await supabase
      .from("cashboxes")
      .insert({
        customer_id: customer.customer_id,
        balance: 0,
      })
      .select("cashbox_id, balance")
      .single();

    if (createCashboxError) {
      throw new Error(createCashboxError.message);
    }

    cashbox = createdCashbox as CashboxRow;
  }

  const cashboxBalance = Number(cashbox?.balance ?? 0);

  return (
    <CashboxSendForm
      accounts={eligibleAccounts}
      cashboxBalance={cashboxBalance}
    />
  );
}
