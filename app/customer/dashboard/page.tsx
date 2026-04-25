import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  HandCoins,
  Inbox,
  MapPin,
  ScanLine,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { getRemainingSavingsWithdrawalAllowance } from "@/lib/banking/server";
import {
  SAVINGS_APY,
  getAccountTypeLabel,
  getMonthKey,
  isCheckingAccount,
  isCreditAccount,
  isSavingsAccount,
} from "@/lib/banking/rules";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const quickActions = [
  {
    title: "Accounts",
    description: "Review checking, savings, and credit products.",
    href: "/customer/accounts",
    icon: Wallet,
  },
  {
    title: "Transfers",
    description: "Move money between deposit accounts or pay your card.",
    href: "/customer/transfers",
    icon: ArrowLeftRight,
  },
  {
    title: "Withdraw",
    description: "Withdraw cash or take a credit cash advance.",
    href: "/customer/withdraw",
    icon: Banknote,
  },
  {
    title: "Credit Card",
    description: "Post purchases and review active card balances.",
    href: "/customer/credit-card",
    icon: CreditCard,
  },
  {
    title: "Loans",
    description: "Apply for a loan, monitor approval, and repay from checking.",
    href: "/customer/loans",
    icon: HandCoins,
  },
  {
    title: "Cheque Deposit",
    description: "Deposit cheques into checking or savings accounts.",
    href: "/customer/deposit-cheque",
    icon: ScanLine,
  },
  {
    title: "CashBox",
    description: "Receive funds by phone number and move them to deposit accounts.",
    href: "/customer/cashbox",
    icon: Inbox,
  },
  {
    title: "Bill Pay",
    description: "Manage and schedule payments from checking accounts.",
    href: "/customer/bill-payments",
    icon: CreditCard,
  },
  {
    title: "Find ATM",
    description: "Locate the nearest ATM from your current area.",
    href: "/customer/dashboard/find-atm",
    icon: MapPin,
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

type SavingsMonthlyActivityRow = {
  account_id: string;
  withdrawal_cap_amount: number;
  withdrawn_amount: number;
};

type Transaction = {
  transaction_id: string;
  amount: number;
  description: string | null;
  destination_account_id: string | null;
  executed_at: string | null;
  reference_number: string | null;
  source_account_id: string | null;
  status: string | null;
  transaction_type: string | null;
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

  const accounts: Account[] = (accountsData ?? []).map((account) => ({
    account_id: account.account_id,
    account_name: account.account_name ?? "",
    account_number: account.account_number ?? "",
    account_type: account.account_type ?? "",
    balance: Number(account.balance ?? 0),
    currency: account.currency ?? "USD",
    status: account.status ?? "unknown",
  }));

  const creditIds = accounts
    .filter((account) => isCreditAccount(account.account_type))
    .map((account) => account.account_id);
  const savingsIds = accounts
    .filter((account) => isSavingsAccount(account.account_type))
    .map((account) => account.account_id);
  const accountIds = accounts.map((account) => account.account_id);
  const monthKey = getMonthKey();

  const [
    creditAccountsResult,
    creditCardsResult,
    savingsActivityResult,
    rawCashboxDataResult,
    transactionsResult,
  ] = await Promise.all([
    creditIds.length > 0
      ? supabase
          .from("credit_accounts")
          .select(
            "account_id, available_credit, current_balance, minimum_payment_due, payment_due_at"
          )
          .in("account_id", creditIds)
      : Promise.resolve({ data: [] as CreditAccountRow[] }),
    creditIds.length > 0
      ? supabase
          .from("credit_cards")
          .select("account_id, card_brand, card_last4")
          .in("account_id", creditIds)
      : Promise.resolve({ data: [] as CreditCardRow[] }),
    savingsIds.length > 0
      ? supabase
          .from("savings_monthly_activity")
          .select("account_id, withdrawal_cap_amount, withdrawn_amount")
          .in("account_id", savingsIds)
          .eq("month_key", monthKey)
      : Promise.resolve({ data: [] as SavingsMonthlyActivityRow[] }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("cashboxes")
      .select("cashbox_id, balance")
      .eq("customer_id", customer.customer_id)
      .maybeSingle(),
    accountIds.length > 0
      ? supabase
          .from("transactions")
          .select(
            "transaction_id, amount, description, executed_at, reference_number, status, transaction_type"
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
          .limit(6)
      : Promise.resolve({ data: [] as Transaction[] }),
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

  const cashboxBalance = Number(rawCashboxDataResult.data?.balance ?? 0);
  const depositAssets = accounts
    .filter((account) => !isCreditAccount(account.account_type))
    .reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const outstandingCredit = (creditAccountsResult.data ?? []).reduce(
    (sum, account) => sum + Number(account.current_balance || 0),
    0
  );
  const creditAvailable = (creditAccountsResult.data ?? []).reduce(
    (sum, account) => sum + Number(account.available_credit || 0),
    0
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
          <p className="mt-2 max-w-2xl text-slate-400">
            Track deposit balances, savings growth, credit card usage, and recent banking activity from one secure workspace.
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Deposit Assets"
          value={formatCurrency(depositAssets)}
          subtitle="Checking + savings balances"
        />
        <MetricCard
          title="Outstanding Credit"
          value={formatCurrency(outstandingCredit)}
          subtitle="Current card balances"
        />
        <MetricCard
          title="Available Credit"
          value={formatCurrency(creditAvailable)}
          subtitle="Remaining card spending power"
        />
        <MetricCard
          title="Savings APY"
          value={`${(SAVINGS_APY * 100).toFixed(2)}%`}
          subtitle="Compounded monthly"
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <Card className="border-white/10 bg-[#0f172a] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Banking Products</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your active deposit accounts and credit cards.
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
                {accounts.map((account) => {
                  const creditDetails = creditAccountMap.get(account.account_id);
                  const creditCard = creditCardMap.get(account.account_id);
                  const savingsActivity = savingsActivityMap.get(account.account_id);
                  const savingsAllowance = savingsActivity
                    ? getRemainingSavingsWithdrawalAllowance(savingsActivity)
                    : null;

                  return (
                    <Link
                      key={account.account_id}
                      href={`/customer/accounts/${account.account_id}`}
                      className="block rounded-2xl border border-white/10 bg-slate-900/60 p-5 transition hover:border-cyan-400/40 hover:bg-slate-900/80"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                            {getAccountTypeLabel(account.account_type)}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {account.account_name}
                          </p>
                          {isCreditAccount(account.account_type) && creditCard ? (
                            <p className="text-sm text-slate-400">
                              {creditCard.card_brand} card - ****{creditCard.card_last4}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400">
                              ****{account.account_number.slice(-4)}
                            </p>
                          )}
                        </div>

                        <div className="text-left md:text-right">
                          {isCreditAccount(account.account_type) && creditDetails ? (
                            <>
                              <p className="text-sm text-slate-400">Current Balance</p>
                              <p className="text-2xl font-bold text-white">
                                {formatCurrency(creditDetails.current_balance)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Available {formatCurrency(creditDetails.available_credit ?? 0)}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-slate-400">Current Balance</p>
                              <p className="text-2xl font-bold text-white">
                                {formatCurrency(account.balance, account.currency)}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {isCreditAccount(account.account_type) && creditDetails ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <SmallMetric
                            label="Minimum Due"
                            value={formatCurrency(creditDetails.minimum_payment_due)}
                          />
                          <SmallMetric
                            label="Payment Due"
                            value={formatDate(creditDetails.payment_due_at)}
                          />
                        </div>
                      ) : null}

                      {isSavingsAccount(account.account_type) ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <SmallMetric
                            label="Interest Rate"
                            value={`${(SAVINGS_APY * 100).toFixed(2)}% APY`}
                          />
                          <SmallMetric
                            label="Monthly Withdrawal Remaining"
                            value={
                              savingsAllowance !== null
                                ? formatCurrency(savingsAllowance)
                                : "Tracks on first monthly withdrawal"
                            }
                          />
                        </div>
                      ) : null}

                      {isCheckingAccount(account.account_type) ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-400">
                          Checking accounts support flexible deposits, transfers, and withdrawals.
                        </div>
                      ) : null}

                      <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-cyan-400">
                        View details
                      </div>
                    </Link>
                  );
                })}
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
                  <Wallet size={16} />
                  Open Account
                </Link>
              </div>
            )}
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

        <div className="space-y-6">
          <Card className="border-white/10 bg-[#0f172a] p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">CashBox</h2>
              <p className="mt-1 text-sm text-slate-400">
                Receive money by phone number and route it into deposit accounts.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400">Available CashBox Balance</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {formatCurrency(cashboxBalance)}
              </p>
              <Link
                href="/customer/cashbox"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                <Inbox size={16} />
                Manage CashBox
              </Link>
            </div>
          </Card>

          <Card className="border-white/10 bg-[#0f172a] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Recent Activity
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your latest deposit, transfer, fee, and card activity.
                </p>
              </div>

              <Link
                href="/customer/transactions"
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
              >
                Show more
              </Link>
            </div>

            {(transactionsResult.data ?? []).length > 0 ? (
              <div className="space-y-3">
                {(transactionsResult.data ?? []).map((tx) => (
                  <div
                    key={tx.transaction_id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">
                          {formatTransactionType(tx.transaction_type)}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {tx.description || "Transaction"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(tx.executed_at)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs font-medium capitalize text-slate-400">
                          {tx.status || "unknown"}
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
                  Your recent activity will appear here once you start using your accounts.
                </p>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card className="border-white/10 bg-[#0f172a] p-6 text-white">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
    </Card>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
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

function formatDateTime(value: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTransactionType(type: string | null) {
  const normalized = (type || "").toLowerCase();

  switch (normalized) {
    case "credit_payment":
      return "Credit Card Payment";
    case "credit_purchase":
      return "Credit Card Purchase";
    case "cashbox_send":
      return "CashBox Send";
    case "cashbox_withdraw":
      return "CashBox Withdraw";
    case "bill_payment":
      return "Bill Payment";
    case "loan_disbursement":
      return "Loan Disbursement";
    case "loan_payment":
      return "Loan Payment";
    case "fee":
      return "Fee";
    case "interest":
      return "Interest Credit";
    case "withdrawal":
      return "Withdrawal";
    case "deposit":
      return "Deposit";
    default:
      return type
        ? type
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "Transaction";
  }
}

function formatPhone(phone: string | null) {
  if (!phone) return "N/A";

  const digits = normalizePhone(phone);

  if (digits.length !== 10) return phone;

  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizePhone(phone: string | null | undefined) {
  return String(phone ?? "").replace(/\D/g, "");
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
