import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ArrowDownToLine, Send } from "lucide-react";

export const dynamic = "force-dynamic";

type Account = {
  account_id: string;
  account_name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  status: string;
};

export default async function CashBoxPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id, first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer) redirect("/customer/onboarding");

  let { data: cashbox } = await supabase
    .from("cashboxes")
    .select("cashbox_id, balance")
    .eq("customer_id", customer.customer_id)
    .maybeSingle();

  if (!cashbox) {
    const { data: newCashbox, error: createCashboxError } = await supabase
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

    cashbox = newCashbox;
  }

  const cashboxBalance = Number(cashbox?.balance ?? 0);

  const { data: accountsData } = await supabase
    .from("accounts")
    .select(
      "account_id, account_name, account_type, account_number, balance, currency, status"
    )
    .eq("customer_id", customer.customer_id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const accounts: Account[] = (accountsData ?? []).map((acc) => ({
    account_id: acc.account_id,
    account_name: acc.account_name ?? "",
    account_type: acc.account_type ?? "",
    account_number: acc.account_number ?? "",
    balance: Number(acc.balance ?? 0),
    currency: acc.currency ?? "USD",
    status: acc.status ?? "unknown",
  }));

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-[#0f172a] p-8">
        <h1 className="text-3xl font-bold text-white">CashBox</h1>
        <p className="mt-2 text-slate-400">
          Receive money instantly by phone number and manage your CashBox funds.
        </p>
      </section>

      <Card className="border-white/10 bg-[#0f172a] p-6">
        <p className="text-sm text-slate-400">Available Balance</p>
        <p className="mt-2 text-4xl font-bold text-white">
          {formatCurrency(cashboxBalance)}
        </p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-center gap-3">
            <Send className="text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Send by Phone</h2>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            Send money from one of your active accounts to another user&apos;s
            CashBox using their phone number.
          </p>

          <Link
            href="/customer/cashbox/send"
            className="mt-4 inline-block rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Send Money
          </Link>
        </Card>

        <Card className="border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-center gap-3">
            <ArrowDownToLine className="text-emerald-400" />
            <h2 className="text-xl font-bold text-white">
              Withdraw to Account
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            Move money from your CashBox into one of your active bank accounts.
          </p>

          <Link
            href="/customer/cashbox/withdraw"
            className="mt-4 inline-block rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Withdraw
          </Link>
        </Card>
      </div>

      <Card className="border-white/10 bg-[#0f172a] p-6">
        <h2 className="mb-4 text-xl font-bold text-white">Your Active Accounts</h2>

        {accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((acc) => (
              <div
                key={acc.account_id}
                className="flex items-center justify-between rounded-xl border border-white/10 p-4"
              >
                <div>
                  <p className="font-semibold text-white">
                    {acc.account_name || acc.account_type}
                  </p>
                  <p className="text-sm text-slate-400">
                    {acc.account_type} • ****{acc.account_number.slice(-4)}
                  </p>
                </div>

                <p className="font-bold text-white">
                  {formatCurrency(acc.balance, acc.currency)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No active accounts found.</p>
        )}
      </Card>
    </div>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}