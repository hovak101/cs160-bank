import Link from "next/link";
import { CloseAccountButton } from "@/components/customer/close-account-button";
import { OpenAccountForm } from "@/components/customer/open-account-form";
import { Card } from "@/components/ui/card";
import { getRemainingSavingsWithdrawalAllowance } from "@/lib/banking/server";
import {
  SAVINGS_APY,
  getAccountTypeLabel,
  getMonthKey,
  isCreditAccount,
  isSavingsAccount,
} from "@/lib/banking/rules";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

type CreditAccountRow = {
  account_id: string;
  current_balance: number;
};

type CreditCardRow = {
  account_id: string;
  card_brand: string;
  card_last4: string;
  card_status: string;
  rewards_program: string;
  exp_month: number;
  exp_year: number;
};

type SavingsMonthlyActivityRow = {
  account_id: string;
  withdrawal_cap_amount: number;
  withdrawn_amount: number;
};

export default async function AccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return <div className="p-10 text-center">Customer profile not found.</div>;
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("customer_id", customer.customer_id)
    .order("created_at", { ascending: true });

  const creditAccountIds =
    (accounts ?? [])
      .filter((account) => isCreditAccount(account.account_type))
      .map((account) => account.account_id) ?? [];

  const savingsAccountIds =
    (accounts ?? [])
      .filter((account) => isSavingsAccount(account.account_type))
      .map((account) => account.account_id) ?? [];

  const monthKey = getMonthKey();

  const [creditAccountsResult, creditCardsResult, savingsActivityResult] =
    await Promise.all([
      creditAccountIds.length > 0
        ? supabase
            .from("credit_accounts")
            .select("account_id, current_balance")
            .in("account_id", creditAccountIds)
        : Promise.resolve({ data: [] as CreditAccountRow[] }),
      creditAccountIds.length > 0
        ? supabase
            .from("credit_cards")
            .select(
              "account_id, card_brand, card_last4, card_status, rewards_program, exp_month, exp_year"
            )
            .in("account_id", creditAccountIds)
        : Promise.resolve({ data: [] as CreditCardRow[] }),
      savingsAccountIds.length > 0
        ? supabase
            .from("savings_monthly_activity")
            .select("account_id, withdrawal_cap_amount, withdrawn_amount")
            .in("account_id", savingsAccountIds)
            .eq("month_key", monthKey)
        : Promise.resolve({ data: [] as SavingsMonthlyActivityRow[] }),
    ]);

  const creditAccountMap = new Map(
    (creditAccountsResult.data ?? []).map((row) => [row.account_id, row] as const)
  );
  const creditCardMap = new Map(
    (creditCardsResult.data ?? []).map((row) => [row.account_id, row] as const)
  );
  const savingsActivityMap = new Map(
    (savingsActivityResult.data ?? []).map((row) => [row.account_id, row] as const)
  );

  return (
    <main className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] mb-8 border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
              Customer Banking
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Accounts
            </h1>
            <p className="mt-2 max-w-5xl text-slate-400 leading-relaxed">
              Manage your banking accounts
            </p>
          </div>
          <div className="flex-shrink-0">
            <OpenAccountForm />
          </div>

        </div>
      </section>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts?.map((acc) => (
          <Card key={acc.account_id} className="p-6 overflow-hidden border-slate-200 hover:border-teal-200 transition-all group">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 rounded-2xl text-teal-600">
                  <Landmark size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{acc.account_name}</h3>
                  <p className="text-xs font-mono text-white">Account #: {acc.account_number}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Balance</p>
              <p className="text-4xl font-bold text-white">
                ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[11px] font-medium uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Status</span>
                <span className="flex items-center gap-1 text-teal-600 font-bold">
                  {acc.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                Opened {new Date(acc.created_at).toLocaleDateString()}
              </div>
              <CloseAccountButton
                accountId={acc.account_id}
                status={acc.status}
              />
            </div>
          </Card>
        ))}
      </div>

      {!accounts || accounts.length === 0 ? (
        <Card className="border-white/10 bg-[#0f172a] p-8 text-center text-slate-300">
          No banking products yet. Open your first checking, savings, or credit account to get started.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {accounts.map((account) => {
            const creditDetails = creditAccountMap.get(account.account_id);
            const creditCard = creditCardMap.get(account.account_id);
            const savingsActivity = savingsActivityMap.get(account.account_id);
            const savingsAllowance = savingsActivity
              ? getRemainingSavingsWithdrawalAllowance(savingsActivity)
              : null;

            return (
              <Card
                key={account.account_id}
                className="overflow-hidden border-white/10 bg-[#0f172a] p-6 transition-all hover:border-cyan-400/30"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                        {getAccountTypeLabel(account.account_type)}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-white">
                        {account.account_name}
                      </h3>
                      {isCreditAccount(account.account_type) && creditCard ? (
                        <p className="mt-1 text-sm text-slate-400">
                          {creditCard.card_brand} card {maskDigits(creditCard.card_last4)} - exp{" "}
                          {String(creditCard.exp_month).padStart(2, "0")}/{creditCard.exp_year}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-400">
                          Account {maskDigits(account.account_number)}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {formatStatus(account.status)}
                      </p>
                    </div>
                  </div>

                  {isCreditAccount(account.account_type) && creditDetails ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Current Balance
                        </p>
                        <p className="text-4xl font-bold text-white">
                          {formatCurrency(creditDetails.current_balance)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                        Available credit, payment due, rewards, APRs, and cash advance details are shown on the dedicated credit account page.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Current Balance
                        </p>
                        <p className="text-4xl font-bold text-white">
                          {formatCurrency(account.balance, account.currency)}
                        </p>
                      </div>

                      {isSavingsAccount(account.account_type) ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <Metric label="Interest Rate" value={`${(SAVINGS_APY * 100).toFixed(2)}% APY`} />
                          <Metric
                            label="Monthly Withdrawal Remaining"
                            value={
                              savingsAllowance !== null
                                ? formatCurrency(savingsAllowance, account.currency)
                                : "Tracks on first withdrawal"
                            }
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                          Flexible everyday banking for deposits, transfers, withdrawals, and bill payments.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-white/10 pt-5">
                    <div className="text-xs uppercase tracking-widest text-slate-500">
                      Opened {new Date(account.created_at).toLocaleDateString()}
                    </div>

                    <div className="flex items-center gap-4">
                      <Link
                        href={`/customer/accounts/${account.account_id}`}
                        className="text-xs font-semibold uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
                      >
                        View Details
                      </Link>
                      <CloseAccountButton accountId={account.account_id} status={account.status} />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function formatStatus(value: string | null | undefined) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function maskDigits(value: string | null | undefined) {
  if (!value) return "****";
  return `****${value.slice(-4)}`;
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}
