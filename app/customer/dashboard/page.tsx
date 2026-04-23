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
  Inbox,
} from "lucide-react";
import { Card } from "@/components/ui/card";

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
    title: "Transfers",
    description: "Move money between your own accounts.",
    href: "/customer/transfers",
    icon: ArrowLeftRight,
  },
  {
    title: "CashBox",
    description: "Receive money by phone and manage your CashBox balance.",
    href: "/customer/cashbox",
    icon: Inbox,
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
    href: "/customer/bill-payments",
    icon: CreditCard,
  },
  {
    title: "Find ATM",
    description: "Locate the nearest Chase ATM from your current area.",
    href: "/customer/dashboard/find-atm",
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
  transaction_type: string | null;
  status: string | null;
  description: string | null;
  executed_at: string | null;
};

type CashboxRow = {
  cashbox_id: string;
  balance: number;
};

export default async function CustomerDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id, first_name, last_name, phone_number")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer) redirect("/customer/onboarding");

  const displayName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "Customer";

  const currentPhoneDigits = normalizePhone(customer.phone_number);

  const { data: accountsData } = await supabase
    .from("accounts")
    .select(
      "account_id, account_name, account_number, account_type, balance, currency, status"
    )
    .eq("customer_id", customer.customer_id)
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

  const accountIds = accounts.map((account) => account.account_id);

  let recentTransactions: Transaction[] = [];

  const accountOrQuery =
    accountIds.length > 0
      ? accountIds
          .map(
            (id) =>
              `source_account_id.eq.${id},destination_account_id.eq.${id}`
          )
          .join(",")
      : "";

  const accountTxPromise =
    accountOrQuery.length > 0
      ? supabase
          .from("transactions")
          .select(
            "transaction_id, reference_number, source_account_id, destination_account_id, amount, transaction_type, status, description, executed_at"
          )
          .or(accountOrQuery)
          .order("executed_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [], error: null } as any);

  const incomingCashboxPromise = currentPhoneDigits
    ? supabase
        .from("transactions")
        .select(
          "transaction_id, reference_number, source_account_id, destination_account_id, amount, transaction_type, status, description, executed_at"
        )
        .eq("transaction_type", "cashbox_send")
        .ilike("description", `%${currentPhoneDigits}%`)
        .order("executed_at", { ascending: false })
        .limit(10)
    : Promise.resolve({ data: [], error: null } as any);

  const [accountTxResult, incomingCashboxResult] = await Promise.all([
    accountTxPromise,
    incomingCashboxPromise,
  ]);

  const mergedMap = new Map<string, Transaction>();

  for (const tx of accountTxResult.data ?? []) {
    mergedMap.set(tx.transaction_id, {
      transaction_id: tx.transaction_id,
      reference_number: tx.reference_number ?? "",
      source_account_id: tx.source_account_id,
      destination_account_id: tx.destination_account_id,
      amount: Number(tx.amount ?? 0),
      transaction_type: tx.transaction_type,
      status: tx.status,
      description: tx.description,
      executed_at: tx.executed_at,
    });
  }

  for (const tx of incomingCashboxResult.data ?? []) {
    mergedMap.set(tx.transaction_id, {
      transaction_id: tx.transaction_id,
      reference_number: tx.reference_number ?? "",
      source_account_id: tx.source_account_id,
      destination_account_id: tx.destination_account_id,
      amount: Number(tx.amount ?? 0),
      transaction_type: tx.transaction_type,
      status: tx.status,
      description: tx.description,
      executed_at: tx.executed_at,
    });
  }

  recentTransactions = Array.from(mergedMap.values())
    .sort((a, b) => {
      const aTime = a.executed_at ? new Date(a.executed_at).getTime() : 0;
      const bTime = b.executed_at ? new Date(b.executed_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  const { data: rawCashboxData } = await (supabase as any)
    .from("cashboxes")
    .select("cashbox_id, balance")
    .eq("customer_id", customer.customer_id)
    .maybeSingle();

  const cashboxData = rawCashboxData as CashboxRow | null;
  const cashboxBalance = Number(cashboxData?.balance ?? 0);

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance ?? 0),
    0
  );

  const pendingPayments = recentTransactions.filter(
    (tx) => tx.status?.toLowerCase() === "pending"
  ).length;

  const accountMap = new Map(
    accounts.map((account) => [account.account_id, account] as const)
  );

  return (
    <div className="space-y-8">
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Accounts Overview"
          value={formatCurrency(totalBalance)}
        />
        <MetricCard
          title="CashBox Balance"
          value={formatCurrency(cashboxBalance)}
        />
        <MetricCard title="Pending Payments" value={String(pendingPayments)} />
        <MetricCard
          title="Recent Transactions"
          value={String(recentTransactions.length)}
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
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

          <Card className="border-white/10 bg-[#0f172a] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">CashBox</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Receive money by phone number and keep it in your CashBox.
                </p>
              </div>
              <Link
                href="/customer/cashbox"
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
              >
                Open CashBox
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">
                    Available CashBox Balance
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Money received from other users will appear here instantly.
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(cashboxBalance)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Link
                  href="/customer/cashbox"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <Inbox size={16} />
                  Manage CashBox
                </Link>
              </div>
            </div>
          </Card>

          <section>
            <h2 className="mb-6 text-xl font-bold text-white">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                {recentTransactions.map((tx) => {
                  const meta = getTransactionMeta(
                    tx,
                    accountMap,
                    currentPhoneDigits
                  );
                  const amountPrefix =
                    meta.direction === "incoming"
                      ? "+"
                      : meta.direction === "outgoing"
                      ? "-"
                      : "";

                  return (
                    <div
                      key={tx.transaction_id}
                      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{meta.title}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {meta.subtitle}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(tx.executed_at)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold text-white">
                            {amountPrefix}
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
                            {tx.status || "unknown"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
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

function formatDate(dateString: string | null) {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizePhone(phone: string | null) {
  return (phone ?? "").replace(/\D/g, "");
}

function formatPhone(phone: string | null) {
  if (!phone) return "N/A";

  const digits = normalizePhone(phone);

  if (digits.length !== 10) return phone;

  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function parseCashboxDescription(description: string | null) {
  const text = description ?? "";

  let match = text.match(
    /(?:sent|cashbox)\s+from\s+(\d{10})\s+to\s+(\d{10})/i
  );
  if (match) {
    return {
      senderPhone: match[1],
      receiverPhone: match[2],
    };
  }

  match = text.match(/sent\s+to\s+cashbox\s*\(?(\d{10})\)?/i);
  if (match) {
    return {
      senderPhone: null,
      receiverPhone: match[1],
    };
  }

  const phones = text.match(/\b\d{10}\b/g) ?? [];
  return {
    senderPhone: phones[0] ?? null,
    receiverPhone: phones[1] ?? phones[0] ?? null,
  };
}

function getAccountLabel(
  accountId: string | null,
  accountMap: Map<string, Account>
) {
  if (!accountId) return null;
  const account = accountMap.get(accountId);
  if (!account) return null;
  return `${account.account_name} • ****${account.account_number?.slice(-4)}`;
}

function getTransactionMeta(
  tx: Transaction,
  accountMap: Map<string, Account>,
  currentPhoneDigits: string
) {
  const sourceOwned = !!(
    tx.source_account_id && accountMap.has(tx.source_account_id)
  );
  const destinationOwned = !!(
    tx.destination_account_id && accountMap.has(tx.destination_account_id)
  );

  const sourceLabel = getAccountLabel(tx.source_account_id, accountMap);
  const destinationLabel = getAccountLabel(tx.destination_account_id, accountMap);
  const normalizedType = (tx.transaction_type || "").toLowerCase();
  const parsed = parseCashboxDescription(tx.description);

  if (normalizedType === "cashbox_send") {
    const isIncomingCashbox =
      !!currentPhoneDigits &&
      normalizePhone(parsed.receiverPhone) === currentPhoneDigits &&
      !sourceOwned;

    if (isIncomingCashbox) {
      return {
        direction: "incoming" as const,
        title: "Received in CashBox",
        subtitle: `Received from ${formatPhone(parsed.senderPhone)}`,
      };
    }

    return {
      direction: "outgoing" as const,
      title: "Sent to CashBox",
      subtitle: `Sent to ${formatPhone(parsed.receiverPhone)}`,
    };
  }

  if (normalizedType === "cashbox_withdraw") {
    return {
      direction: "incoming" as const,
      title: "Withdraw from CashBox",
      subtitle: `Moved from CashBox to ${destinationLabel || "your account"}`,
    };
  }

  if (normalizedType === "deposit") {
    return {
      direction: "incoming" as const,
      title: "Deposit",
      subtitle: tx.description || "Deposit completed",
    };
  }

  if (normalizedType === "withdraw" || normalizedType === "withdrawal") {
    return {
      direction: "outgoing" as const,
      title: "Withdrawal",
      subtitle: tx.description || "Withdrawal completed",
    };
  }

  if (sourceOwned && destinationOwned) {
    return {
      direction: "internal" as const,
      title: "Internal Transfer",
      subtitle: tx.description || "Transfer between your accounts",
    };
  }

  if (destinationOwned) {
    return {
      direction: "incoming" as const,
      title: "Incoming Transfer",
      subtitle: tx.description || "Money received",
    };
  }

  return {
    direction: "outgoing" as const,
    title: "Outgoing Transfer",
    subtitle: tx.description || "Money sent",
  };
}
