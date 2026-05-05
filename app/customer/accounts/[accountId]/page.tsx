import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { CloseAccountButton } from "@/components/customer/close-account-button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getRemainingSavingsWithdrawalAllowance } from "@/lib/banking/server";
import {
  CREDIT_CASH_ADVANCE_FEE_RATE,
  CREDIT_CASH_ADVANCE_MIN_FEE,
  SAVINGS_APY,
  getAccountTypeLabel,
  getMonthKey,
  isDepositEligible,
  isCreditAccount,
  isSavingsAccount,
} from "@/lib/banking/rules";
import { ClaimCreditRewardsForm } from "@/components/customer/claim-credit-rewards-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    accountId: string;
  }>;
};

type AccountRow = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string;
};

type AccountLabelRow = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  status: string;
};

type CreditAccountRow = {
  account_id: string;
  available_credit: number | null;
  cash_advance_apr: number;
  cash_advance_balance: number;
  cash_advance_limit: number;
  credit_limit: number;
  current_balance: number;
  minimum_payment_due: number;
  next_statement_at: string | null;
  payment_due_at: string | null;
  purchase_apr: number;
  rewards_points: number;
  statement_balance: number;
};

type CreditCardRow = {
  account_id: string;
  card_brand: string;
  card_last4: string;
  card_status: string;
  cardholder_name: string;
  exp_month: number;
  exp_year: number;
  rewards_program: string;
  rewards_rate: number;
  security_code_mode: string;
};

type SavingsMonthlyActivityRow = {
  account_id: string;
  withdrawal_cap_amount: number;
  withdrawn_amount: number;
};

type TransactionRow = {
  transaction_id: string;
  reference_number: string | null;
  source_account_id: string | null;
  destination_account_id: string | null;
  amount: number;
  transaction_type: string | null;
  status: string | null;
  description: string | null;
  executed_at: string | null;
};

type TransactionDirection = "incoming" | "outgoing" | "internal";

export default async function AccountDetailPage({ params }: PageProps) {
  const { accountId } = await params;
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

  const { data: accountData } = await supabase
    .from("accounts")
    .select(
      "account_id, account_name, account_number, account_type, balance, currency, status, created_at"
    )
    .eq("customer_id", customer.customer_id)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!accountData) notFound();

  const account: AccountRow = {
    account_id: accountData.account_id,
    account_name: accountData.account_name ?? "Account",
    account_number: accountData.account_number ?? "",
    account_type: accountData.account_type ?? "",
    balance: Number(accountData.balance ?? 0),
    currency: accountData.currency ?? "USD",
    status: accountData.status ?? "unknown",
    created_at: accountData.created_at ?? new Date().toISOString(),
  };

  const monthKey = getMonthKey();

  const [allAccountsResult, creditAccountResult, creditCardResult, savingsActivityResult, transactionsResult] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("account_id, account_name, account_number, account_type, status")
        .eq("customer_id", customer.customer_id),
      isCreditAccount(account.account_type)
        ? supabase
            .from("credit_accounts")
            .select(
              "account_id, available_credit, cash_advance_apr, cash_advance_balance, cash_advance_limit, credit_limit, current_balance, minimum_payment_due, next_statement_at, payment_due_at, purchase_apr, rewards_points, statement_balance"
            )
            .eq("account_id", account.account_id)
            .maybeSingle()
        : Promise.resolve({ data: null as CreditAccountRow | null }),
      isCreditAccount(account.account_type)
        ? supabase
            .from("credit_cards")
            .select(
              "account_id, card_brand, card_last4, card_status, cardholder_name, exp_month, exp_year, rewards_program, rewards_rate, security_code_mode"
            )
            .eq("account_id", account.account_id)
            .maybeSingle()
        : Promise.resolve({ data: null as CreditCardRow | null }),
      isSavingsAccount(account.account_type)
        ? supabase
            .from("savings_monthly_activity")
            .select("account_id, withdrawal_cap_amount, withdrawn_amount")
            .eq("account_id", account.account_id)
            .eq("month_key", monthKey)
            .maybeSingle()
        : Promise.resolve({ data: null as SavingsMonthlyActivityRow | null }),
      supabase
        .from("transactions")
        .select(
          "transaction_id, reference_number, source_account_id, destination_account_id, amount, transaction_type, status, description, executed_at"
        )
        .or(`source_account_id.eq.${account.account_id},destination_account_id.eq.${account.account_id}`)
        .order("executed_at", { ascending: false })
        .limit(50),
    ]);

  const accountMap = new Map(
    ((allAccountsResult.data ?? []) as AccountLabelRow[]).map((row) => [row.account_id, row] as const)
  );
  const rewardsDestinationAccounts = ((allAccountsResult.data ?? []) as AccountLabelRow[]).filter(
    (row) =>
      row.account_id !== account.account_id &&
      isDepositEligible(row.account_type) &&
      (row.status ?? "").toLowerCase() === "active"
  );
  const creditDetails = creditAccountResult.data;
  const creditCard = creditCardResult.data;
  const savingsActivity = savingsActivityResult.data;
  const savingsAllowance = savingsActivity
    ? getRemainingSavingsWithdrawalAllowance(savingsActivity)
    : null;
  const transactions: TransactionRow[] = (transactionsResult.data ?? []).map((row) => ({
    transaction_id: row.transaction_id,
    reference_number: row.reference_number,
    source_account_id: row.source_account_id,
    destination_account_id: row.destination_account_id,
    amount: Number(row.amount ?? 0),
    transaction_type: row.transaction_type,
    status: row.status,
    description: row.description,
    executed_at: row.executed_at,
  }));

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/customer/accounts"
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300"
          >
            <ArrowLeft size={16} />
            Back to accounts
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            {account.account_name}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {getAccountTypeLabel(account.account_type)} details, balance insights, and account-specific transaction history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isCreditAccount(account.account_type) ? (
            <Link
              href="/customer/credit-card"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:text-cyan-300"
            >
              <CreditCard size={16} />
              Credit card center
            </Link>
          ) : null}
          <CloseAccountButton accountId={account.account_id} status={account.status} />
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden border-white/10 bg-[#0f172a]">
          {isCreditAccount(account.account_type) && creditDetails && creditCard ? (
            <div className="relative h-full overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#164e63_100%)] p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#22d3ee22,transparent_45%),radial-gradient(circle_at_bottom_right,#60a5fa22,transparent_35%)]" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                      {creditCard.card_brand} Signature
                    </p>
                    <p className="mt-3 text-2xl font-bold text-white">
                      {account.account_name}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {creditCard.cardholder_name}
                    </p>
                  </div>

                  <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    {account.status}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                    Card number
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-[0.35em] text-white">
                    **** **** **** {creditCard.card_last4}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <VisualMetric label="Available credit" value={formatCurrency(creditDetails.available_credit ?? 0)} />
                  <VisualMetric label="Statement balance" value={formatCurrency(creditDetails.statement_balance)} />
                  <VisualMetric
                    label="Expires"
                    value={`${String(creditCard.exp_month).padStart(2, "0")}/${String(creditCard.exp_year).slice(-2)}`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-between gap-8 rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#1e293b_100%)] p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                    {getAccountTypeLabel(account.account_type)}
                  </p>
                  <p className="mt-3 text-2xl font-bold text-white">{account.account_name}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Account {maskDigits(account.account_number)}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  {account.status}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Available balance
                </p>
                <p className="mt-3 text-5xl font-bold tracking-tight text-white">
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <VisualMetric label="Account type" value={getAccountTypeLabel(account.account_type)} />
                <VisualMetric label="Opened" value={formatShortDate(account.created_at)} />
                <VisualMetric label="Status" value={account.status} />
              </div>
            </div>
          )}
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {isCreditAccount(account.account_type) && creditDetails && creditCard ? (
            <>
              <DetailMetric label="Current balance" value={formatCurrency(creditDetails.current_balance)} />
              <DetailMetric label="Credit limit" value={formatCurrency(creditDetails.credit_limit)} />
              <DetailMetric label="Minimum due" value={formatCurrency(creditDetails.minimum_payment_due)} />
              <DetailMetric label="Payment due" value={formatShortDate(creditDetails.payment_due_at)} />
              <DetailMetric label="Purchase APR" value={formatPercent(creditDetails.purchase_apr)} />
              <DetailMetric label="Cash advance APR" value={formatPercent(creditDetails.cash_advance_apr)} />
              <DetailMetric label="Cash advance used" value={formatCurrency(creditDetails.cash_advance_balance)} />
              <DetailMetric label="Cash advance limit" value={formatCurrency(creditDetails.cash_advance_limit)} />
              <DetailMetric label="Rewards program" value={creditCard.rewards_program} />
              <DetailMetric label="Rewards rate" value={formatPercent(creditCard.rewards_rate * 100)} />
              <DetailMetric label="Rewards points" value={Number(creditDetails.rewards_points || 0).toFixed(2)} />
              <DetailMetric label="Next statement close" value={formatShortDate(creditDetails.next_statement_at)} />
            </>
          ) : (
            <>
              <DetailMetric label="Current balance" value={formatCurrency(account.balance, account.currency)} />
              <DetailMetric label="Account number" value={maskDigits(account.account_number)} />
              <DetailMetric label="Status" value={account.status} />
              <DetailMetric label="Opened on" value={formatShortDate(account.created_at)} />
              {isSavingsAccount(account.account_type) ? (
                <>
                  <DetailMetric label="Savings APY" value={`${(SAVINGS_APY * 100).toFixed(2)}%`} />
                  <DetailMetric
                    label="Monthly withdrawal remaining"
                    value={
                      savingsAllowance !== null
                        ? formatCurrency(savingsAllowance, account.currency)
                        : "Tracks after first withdrawal"
                    }
                  />
                </>
              ) : (
                <>
                  <DetailMetric label="Deposits" value="Available anytime" />
                  <DetailMetric label="Withdrawals" value="Available anytime" />
                </>
              )}
            </>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card className="border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-400">
              {isCreditAccount(account.account_type) ? <CreditCard size={22} /> : <Wallet size={22} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Account overview</h2>
              <p className="mt-1 text-sm text-slate-400">
                {isCreditAccount(account.account_type)
                  ? "Credit cards use available credit instead of accepting cash deposits directly. Payments lower your balance and restore spending power."
                  : isSavingsAccount(account.account_type)
                  ? "Savings accounts earn monthly interest and cap outgoing withdrawals at 10% of the month-opening balance."
                  : "Checking accounts support flexible deposits, transfers, and withdrawals with no monthly withdrawal cap."}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Product rules</h2>
              <p className="mt-1 text-sm text-slate-400">
                {isCreditAccount(account.account_type)
                  ? `Cash advances carry a ${formatPercent(CREDIT_CASH_ADVANCE_FEE_RATE * 100)} fee with a ${formatCurrency(CREDIT_CASH_ADVANCE_MIN_FEE)} minimum, plus a separate APR and limit.`
                  : isSavingsAccount(account.account_type)
                  ? `Interest accrues monthly at ${(SAVINGS_APY * 100).toFixed(2)}% APY and monthly withdrawals are capped by policy.`
                  : "Checking remains your flexible operating account for deposits, transfers, cash access, and bill payments."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {isCreditAccount(account.account_type) && creditDetails && creditCard ? (
        <Card className="border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Security code reminder</h2>
              <p className="mt-1 text-sm text-slate-400">
                {creditCard.security_code_mode === "legacy_demo"
                  ? "This older demo card temporarily uses the last 3 digits from the visible 4-digit card ending for purchases and cash advances."
                  : "Use the 3-digit security code you set when this card was issued whenever you make a purchase or take a cash advance."}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                This demo prompt will be replaced by verified email reset and change
                requests when the production app ships.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {isCreditAccount(account.account_type) && creditDetails ? (
        <ClaimCreditRewardsForm
          creditAccountId={account.account_id}
          rewardsBalance={Number(creditDetails.rewards_points || 0)}
          destinationAccounts={rewardsDestinationAccounts}
        />
      ) : null}

      <Card className="overflow-hidden border-white/10 bg-[#0f172a]">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Account transactions</h2>
              <p className="mt-1 text-sm text-slate-400">
                Showing the latest {transactions.length} transaction{transactions.length === 1 ? "" : "s"} tied to this account.
              </p>
            </div>

            <Link
              href="/customer/transactions"
              className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
            >
              View all activity
            </Link>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">
              <ReceiptText size={24} />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">No transactions yet</h3>
            <p className="mt-2 text-sm text-slate-400">
              Activity for this account will appear here once the account is used.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {transactions.map((transaction) => {
              const meta = getScopedTransactionMeta(transaction, account.account_id, accountMap);

              return (
                <div
                  key={transaction.transaction_id}
                  className="grid gap-4 px-6 py-5 lg:grid-cols-[1.2fr_0.75fr_0.55fr_0.6fr]"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">
                      {getTransactionIcon(meta.direction)}
                    </div>

                    <div className="min-w-0">
                      <p className="text-base font-semibold text-white">{meta.title}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {meta.subtitle}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Ref: {transaction.reference_number || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-400">Counterparty</p>
                    <p className="mt-1 text-sm text-white">{meta.counterparty}</p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-400">Status</p>
                    <p className={`mt-1 text-sm font-semibold capitalize ${getStatusColor(transaction.status)}`}>
                      {transaction.status || "unknown"}
                    </p>
                  </div>

                  <div className="flex flex-col justify-center lg:items-end">
                    <p className="text-sm font-medium text-slate-400">Amount</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {meta.amountPrefix}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(transaction.executed_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </main>
  );
}

function VisualMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-[#0f172a] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </Card>
  );
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

function formatShortDate(value: string | null) {
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

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function getStatusColor(status: string | null) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "text-emerald-400";
    case "pending":
      return "text-amber-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
}

function getTransactionIcon(direction: TransactionDirection) {
  if (direction === "incoming") return <ArrowDownLeft size={20} />;
  if (direction === "outgoing") return <ArrowUpRight size={20} />;
  return <ArrowLeftRight size={20} />;
}

function getScopedTransactionMeta(
  transaction: TransactionRow,
  currentAccountId: string,
  accountMap: Map<string, AccountLabelRow>
) {
  const isOutgoing =
    transaction.source_account_id === currentAccountId &&
    transaction.destination_account_id !== currentAccountId;
  const isIncoming =
    transaction.destination_account_id === currentAccountId &&
    transaction.source_account_id !== currentAccountId;
  const direction: TransactionDirection = isIncoming
    ? "incoming"
    : isOutgoing
    ? "outgoing"
    : "internal";
  const normalizedType = (transaction.transaction_type || "").toLowerCase();
  const sourceLabel = getAccountLabel(transaction.source_account_id, accountMap);
  const destinationLabel = getAccountLabel(transaction.destination_account_id, accountMap);

  switch (normalizedType) {
    case "credit_payment":
      return {
        direction,
        title: "Credit Card Payment",
        subtitle: transaction.description || "Payment applied to this card balance.",
        counterparty: isIncoming ? sourceLabel || "Deposit account" : destinationLabel || "Credit card",
        amountPrefix: isIncoming ? "+" : "-",
      };
    case "credit_purchase":
      return {
        direction: "outgoing" as const,
        title: "Card Purchase",
        subtitle: transaction.description || "Card purchase posted.",
        counterparty: "Merchant",
        amountPrefix: "-",
      };
    case "fee":
      return {
        direction: "outgoing" as const,
        title: "Fee",
        subtitle: transaction.description || "Bank fee posted.",
        counterparty: "Bank",
        amountPrefix: "-",
      };
    case "interest":
      return {
        direction: "incoming" as const,
        title: "Interest Credit",
        subtitle: transaction.description || "Interest credited to this account.",
        counterparty: "Bank",
        amountPrefix: "+",
      };
    case "deposit":
    case "atm_deposit":
      return {
        direction: "incoming" as const,
        title:
          normalizedType === "atm_deposit" ? "ATM Deposit" : "Deposit",
        subtitle:
          transaction.description ||
          (normalizedType === "atm_deposit"
            ? "ATM deposit completed."
            : "Deposit completed."),
        counterparty: "External source",
        amountPrefix: "+",
      };
    case "withdraw":
    case "withdrawal":
    case "atm_withdrawal":
      return {
        direction: "outgoing" as const,
        title:
          normalizedType === "atm_withdrawal" ? "ATM Withdrawal" : "Withdrawal",
        subtitle:
          transaction.description ||
          (normalizedType === "atm_withdrawal"
            ? "ATM withdrawal completed."
            : "Withdrawal completed."),
        counterparty: "Cash / external",
        amountPrefix: "-",
      };
    default:
      return {
        direction,
        title: formatTransactionType(transaction.transaction_type),
        subtitle: transaction.description || "Transaction posted.",
        counterparty: isIncoming
          ? sourceLabel || "External source"
          : isOutgoing
          ? destinationLabel || "External destination"
          : sourceLabel || destinationLabel || "Internal movement",
        amountPrefix: isIncoming ? "+" : isOutgoing ? "-" : "",
      };
  }
}

function getAccountLabel(
  accountId: string | null,
  accountMap: Map<string, AccountLabelRow>
) {
  if (!accountId) return null;
  const account = accountMap.get(accountId);
  if (!account) return null;
  return `${account.account_name} ${maskDigits(account.account_number)}`;
}

function formatTransactionType(type: string | null) {
  const normalized = (type || "").toLowerCase();

  switch (normalized) {
    case "cashbox_send":
      return "CashBox Send";
    case "cashbox_withdraw":
      return "CashBox Withdraw";
    case "bill_payment":
      return "Bill Payment";
    case "credit_payment":
      return "Credit Card Payment";
    case "credit_purchase":
      return "Credit Card Purchase";
    case "loan_disbursement":
      return "Loan Disbursement";
    case "loan_payment":
      return "Loan Payment";
    case "atm_deposit":
      return "ATM Deposit";
    case "atm_withdrawal":
      return "ATM Withdrawal";
    case "withdrawal":
      return "Withdrawal";
    case "deposit":
      return "Deposit";
    case "interest":
      return "Interest Credit";
    default:
      return type
        ? type
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "Transaction";
  }
}
