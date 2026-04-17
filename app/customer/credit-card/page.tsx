import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCardPurchaseForm } from "@/components/customer/credit-card-purchase-form";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CreditAccountRow = {
  account_id: string;
  available_credit: number | null;
  current_balance: number;
  minimum_payment_due: number;
  payment_due_at: string | null;
};

type CreditCardRow = {
  account_id: string;
  card_brand: string;
  card_last4: string;
};

export default async function CreditCardPage() {
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

  if (!customer) redirect("/customer/onboarding");

  const { data: accountsData } = await supabase
    .from("accounts")
    .select("account_id, account_name, account_number, status")
    .eq("customer_id", customer.customer_id)
    .eq("account_type", "credit")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const accountIds = (accountsData ?? []).map((account) => account.account_id);

  const [creditAccountsResult, creditCardsResult] = await Promise.all([
    accountIds.length > 0
      ? supabase
          .from("credit_accounts")
          .select(
            "account_id, available_credit, current_balance, minimum_payment_due, payment_due_at"
          )
          .in("account_id", accountIds)
      : Promise.resolve({ data: [] as CreditAccountRow[] }),
    accountIds.length > 0
      ? supabase
          .from("credit_cards")
          .select("account_id, card_brand, card_last4")
          .in("account_id", accountIds)
      : Promise.resolve({ data: [] as CreditCardRow[] }),
  ]);

  const creditAccountMap = new Map(
    (creditAccountsResult.data ?? []).map((row) => [row.account_id, row] as const)
  );
  const creditCardMap = new Map(
    (creditCardsResult.data ?? []).map((row) => [row.account_id, row] as const)
  );

  const accounts =
    (accountsData ?? []).map((account) => {
      const creditAccount = creditAccountMap.get(account.account_id);
      const creditCard = creditCardMap.get(account.account_id);

      return {
        account_id: account.account_id,
        account_name: account.account_name ?? "Credit Card",
        account_number: account.account_number ?? "",
        available_credit: Number(creditAccount?.available_credit ?? 0),
        current_balance: Number(creditAccount?.current_balance ?? 0),
        minimum_payment_due: Number(creditAccount?.minimum_payment_due ?? 0),
        payment_due_at: creditAccount?.payment_due_at ?? null,
        card_brand: creditCard?.card_brand ?? "Visa",
        card_last4: creditCard?.card_last4 ?? account.account_number?.slice(-4) ?? "0000",
      };
    }) ?? [];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            Credit Card Center
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Manage Credit Card Activity
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Simulate purchases, review available credit, and track the minimum payment due on your active cards.
          </p>
        </div>
      </section>

      {accounts.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <Link key={account.account_id} href={`/customer/accounts/${account.account_id}`}>
              <Card className="border-white/10 bg-[#0f172a] p-6 transition hover:border-cyan-400/40">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
                  {account.card_brand}
                </p>
                <h2 className="mt-3 text-2xl font-bold text-white">{account.account_name}</h2>
                <p className="mt-1 text-sm text-slate-400">Card ending in {account.card_last4}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Current balance</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatCurrency(account.current_balance)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Available credit</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatCurrency(account.available_credit)}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
                  <span>Payment due {formatDate(account.payment_due_at)}</span>
                  <span className="font-semibold uppercase tracking-widest text-cyan-400">
                    View details
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </section>
      ) : null}

      <CreditCardPurchaseForm accounts={accounts} />
    </div>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}

function formatDate(value: string | null) {
  if (!value) return "TBD";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
