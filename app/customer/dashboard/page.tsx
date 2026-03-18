import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  ArrowLeftRight,
  CreditCard,
  MapPin,
  ScanLine,
  Banknote,
  PlusCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const quickActions = [
  {
    title: "Accounts",
    description: "View balances, account details, and recent activity.",
    href: "/customer/accounts",
    icon: Wallet,
  },
  {
    title: "Transactions",
    description: "Track deposits, withdrawals, and transfer history.",
    href: "/customer/transactions",
    icon: ArrowLeftRight,
  },
  {
    title: "Withdraw Money",
    description: "Withdraw funds from your available accounts.",
    href: "/customer/withdraw",
    icon: Banknote,
  },
  {
    title: "Bill Pay",
    description: "Manage and schedule payments from checking accounts.",
    href: "/customer/bill-pay",
    icon: CreditCard,
  },
  {
    title: "Find ATM",
    description: "Locate the nearest Chase ATM from your current area.",
    href: "/customer/atm",
    icon: MapPin,
  },
  {
    title: "Cheque Deposit",
    description: "Deposit a cheque using your camera or screenshot upload.",
    href: "/customer/deposit-cheque",
    icon: ScanLine,
  },
];

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

type Transaction = {
  transaction_id: string;
  reference_number: string;
  source_account_id: string | null;
  destination_account_id: string | null;
  amount: number;
  transaction_type: string;
  status: string;
  description: string | null;
  executed_at: string;
};

export default async function CustomerDashboardPage() {
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

  const displayName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "Customer";

  const { data: accountsData } = await supabase
    .from("accounts")
    .select(
      "account_id, account_name, account_number, account_type, balance, currency, status"
    )
    .eq("customer_id", customer.customer_id)
    .order("created_at", { ascending: true });

  const accounts: Account[] = accountsData ?? [];
  const accountIds = accounts.map((account) => account.account_id);

  let recentTransactions: Transaction[] = [];

  if (accountIds.length > 0) {
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select(
        "transaction_id, reference_number, source_account_id, destination_account_id, amount, transaction_type, status, description, executed_at"
      )
      .or(
        accountIds
          .map(
            (id) =>
              `source_account_id.eq.${id},destination_account_id.eq.${id}`
          )
          .join(",")
      )
      .order("executed_at", { ascending: false })
      .limit(5);

    recentTransactions = transactionsData ?? [];
  }

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance ?? 0),
    0
  );

  const pendingPayments = recentTransactions.filter(
    (tx) => tx.status?.toLowerCase() === "pending"
  ).length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            Customer Dashboard
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Welcome back, {displayName}
          </h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Access your banking tools from one secure workspace.
          </p>
        </div>
      </section>

      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard
          title="Accounts Overview"
          value={formatCurrency(totalBalance)}
        />
        <MetricCard title="Pending Payments" value={String(pendingPayments)} />
        <MetricCard
          title="Recent Transactions"
          value={String(recentTransactions.length)}
        />
      </div>

      {/* Main Content */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        {/* Left */}
        <div className="space-y-6">
          {/* Banking Account */}
          <Card className="border-white/10 bg-[#0f172a] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Banking Account</h2>
                <p className="mt-1 text-sm text-slate-400">
                  See all opened accounts and current balances.
                </p>
              </div>
              <Link
                href="/customer/accounts"
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
              >
                Manage Accounts
              </Link>
            </div>

            {accounts.length > 0 ? (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div
                    key={account.account_id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-base font-semibold text-white">
                        {account.account_name || account.account_type}
                      </p>
                      <p className="text-sm text-slate-400">
                        {account.account_type} • ****
                        {account.account_number?.slice(-4)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        Status: {account.status}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(account.balance, account.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center">
                <p className="text-lg font-semibold text-white">
                  No account found
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  You have not opened any bank account yet.
                </p>
                <Link
                  href="/customer/accounts"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <PlusCircle size={16} />
                  Open Account
                </Link>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <section>
            <h2 className="mb-6 text-xl font-bold text-white">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((item) => (
                <Link key={item.title} href={item.href}>
                  <Card className="group h-full border-white/10 bg-[#0f172a] p-6 transition-all hover:border-cyan-400/50">
                    <div className="mb-4 w-fit rounded-xl bg-cyan-400/10 p-3 text-cyan-400">
                      <item.icon size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {item.description}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right - Recent Transactions */}
        <div>
          <Card className="border-white/10 bg-[#0f172a] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Recent Transactions
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your latest account activity.
                </p>
              </div>

              <Link
                href="/customer/transactions"
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
              >
                Show more
              </Link>
            </div>

            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.transaction_id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold capitalize text-white">
                          {tx.transaction_type || "Transaction"}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {tx.description || tx.reference_number || "No description"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(tx.executed_at)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {formatCurrency(tx.amount)}
                        </p>
                        <p
                          className={`text-xs font-medium capitalize ${
                            tx.status?.toLowerCase() === "completed"
                              ? "text-emerald-400"
                              : tx.status?.toLowerCase() === "pending"
                              ? "text-amber-400"
                              : "text-slate-400"
                          }`}
                        >
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center">
                <p className="text-lg font-semibold text-white">
                  No recent transactions
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Your recent activity will appear here once you start using your
                  account.
                </p>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="border-white/10 bg-[#0f172a] p-6 text-white">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </Card>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}