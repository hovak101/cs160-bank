import { createClient } from "@/lib/supabase/server";
import {
  Activity,
  ArrowRightLeft,
  ChevronRight,
  CircleDollarSign,
  HandCoins,
  Landmark,
  PiggyBank,
  Wallet,
} from "lucide-react";

type TxRow = {
  amount: number | null;
  transaction_type: string | null;
  executed_at: string | null;
};

type AccountRow = {
  account_id: string;
  balance: number | null;
  account_type: string | null;
  status: string | null;
};

type BankIncomeRow = {
  amount: number | null;
  income_category: string | null;
  description: string | null;
  reference_number: string | null;
  recognized_at: string | null;
};

type CreditExposureRow = {
  account_id: string;
  current_balance: number | null;
  credit_limit: number | null;
};

type LoanRow = {
  accrued_interest: number | null;
  outstanding_principal: number | null;
  status: string | null;
};

export async function AdminDashboardStats() {
  const supabase = await createClient();

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    { data: customersData },
    { data: accountsData },
    { data: currentTxData },
    { data: previousTxData },
    { data: sixMonthTxData },
    { data: currentIncomeData },
    { data: previousIncomeData },
    { data: recentIncomeData },
    { data: creditExposureData },
    loansResult,
  ] = await Promise.all([
    supabase.from("customers").select("customer_id"),
    supabase.from("accounts").select("account_id, balance, account_type, status"),
    supabase
      .from("transactions")
      .select("amount, transaction_type, executed_at")
      .gte("executed_at", currentMonthStart.toISOString())
      .lt("executed_at", nextMonthStart.toISOString())
      .eq("status", "completed"),
    supabase
      .from("transactions")
      .select("amount, transaction_type, executed_at")
      .gte("executed_at", previousMonthStart.toISOString())
      .lt("executed_at", currentMonthStart.toISOString())
      .eq("status", "completed"),
    supabase
      .from("transactions")
      .select("amount, transaction_type, executed_at")
      .gte("executed_at", sixMonthStart.toISOString())
      .lt("executed_at", nextMonthStart.toISOString())
      .eq("status", "completed"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("bank_income")
      .select(
        "amount, income_category, description, reference_number, recognized_at"
      )
      .gte("recognized_at", currentMonthStart.toISOString())
      .lt("recognized_at", nextMonthStart.toISOString()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("bank_income")
      .select(
        "amount, income_category, description, reference_number, recognized_at"
      )
      .gte("recognized_at", previousMonthStart.toISOString())
      .lt("recognized_at", currentMonthStart.toISOString()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("bank_income")
      .select(
        "amount, income_category, description, reference_number, recognized_at"
      )
      .order("recognized_at", { ascending: false })
      .limit(8),
    supabase
      .from("credit_accounts")
      .select("account_id, current_balance, credit_limit"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("loans")
      .select("outstanding_principal, accrued_interest, status"),
  ]);

  const customers = customersData ?? [];
  const accounts = (accountsData ?? []) as AccountRow[];
  const currentTx = (currentTxData ?? []) as TxRow[];
  const previousTx = (previousTxData ?? []) as TxRow[];
  const sixMonthTx = (sixMonthTxData ?? []) as TxRow[];
  const currentIncome = (currentIncomeData ?? []) as BankIncomeRow[];
  const previousIncome = (previousIncomeData ?? []) as BankIncomeRow[];
  const recentIncome = (recentIncomeData ?? []) as BankIncomeRow[];
  const creditExposure = (creditExposureData ?? []) as CreditExposureRow[];
  const loans = ((loansResult as { data?: LoanRow[] } | null)?.data ?? []) as LoanRow[];

  const totalCustomers = customers.length;
  const activeAccounts = accounts.filter((account) => account.status === "active");
  const depositAccounts = activeAccounts.filter((account) =>
    isDepositAccount(account.account_type)
  );
  const withdrawableDeposits = depositAccounts.reduce(
    (sum, acc) => sum + Number(acc.balance || 0),
    0
  );
  const avgDepositBalance =
    depositAccounts.length > 0 ? withdrawableDeposits / depositAccounts.length : 0;
  const largestDepositBalance = depositAccounts.reduce(
    (max, acc) => Math.max(max, Number(acc.balance || 0)),
    0
  );

  const currentDeposits = sumByType(currentTx, ["deposit"]);
  const currentWithdrawals = sumByType(currentTx, ["withdraw", "withdrawal"]);
  const currentCardPurchases = sumByType(currentTx, ["credit_purchase"]);
  const currentPayments = sumByType(currentTx, [
    "credit_payment",
    "loan_payment",
    "bill_payment",
  ]);
  const currentVolume = sumAmounts(currentTx);
  const previousVolume = sumAmounts(previousTx);
  const completedTransactionCount = currentTx.length;
  const avgCompletedTicket =
    completedTransactionCount > 0 ? currentVolume / completedTransactionCount : 0;
  const netCustomerFlow = currentDeposits - currentWithdrawals;
  const volumeGrowth = computeGrowth(currentVolume, previousVolume);
  const monthlyBars = buildMonthlySeries(sixMonthTx);
  const accountMix = buildAccountMix(activeAccounts);

  const currentBankIncome = sumIncome(currentIncome);
  const previousBankIncome = sumIncome(previousIncome);
  const currentFeeIncome = sumIncomeByCategory(currentIncome, "fee");
  const currentInterestChargeIncome = sumIncomeByCategory(
    currentIncome,
    "interest_charge"
  );
  const incomeGrowth = computeGrowth(currentBankIncome, previousBankIncome);
  const avgIncomeEntry =
    currentIncome.length > 0 ? currentBankIncome / currentIncome.length : 0;

  const activeLoans = loans.filter((loan) => loan.status === "active");
  const activeLoanCount = activeLoans.length;
  const outstandingLoanBalance = activeLoans.reduce(
    (sum, loan) =>
      sum +
      Number(loan.outstanding_principal || 0) +
      Number(loan.accrued_interest || 0),
    0
  );
  const outstandingCreditBalance = creditExposure.reduce(
    (sum, account) => sum + Number(account.current_balance || 0),
    0
  );
  const totalCreditLimit = creditExposure.reduce(
    (sum, account) => sum + Number(account.credit_limit || 0),
    0
  );
  const creditUtilization =
    totalCreditLimit > 0 ? outstandingCreditBalance / totalCreditLimit : 0;
  const activeCreditBalanceCount = creditExposure.filter(
    (account) => Number(account.current_balance || 0) > 0
  ).length;

  const totalLentOut = outstandingLoanBalance + outstandingCreditBalance;
  const liquidityBuffer = withdrawableDeposits - totalLentOut;
  const loanToDepositRatio =
    withdrawableDeposits > 0 ? totalLentOut / withdrawableDeposits : 0;
  const liquidityBufferRatio =
    withdrawableDeposits > 0 ? liquidityBuffer / withdrawableDeposits : 0;
  const liquiditySignal = assessLiquiditySignal({
    depositBase: withdrawableDeposits,
    totalLentOut,
    loanToDepositRatio,
    liquidityBufferRatio,
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard
          title="Deposit Funding Base"
          value={formatCurrency(withdrawableDeposits)}
          subtitle="Active checking and savings balances"
          icon={<PiggyBank className="h-4 w-4 text-cyan-400" />}
        />
        <SummaryStatCard
          title="Lending Exposure"
          value={formatCurrency(totalLentOut)}
          subtitle="Loans outstanding plus card balances"
          icon={<HandCoins className="h-4 w-4 text-cyan-400" />}
        />
        <SummaryStatCard
          title="Bank Income MTD"
          value={formatCurrency(currentBankIncome)}
          subtitle="Recognized fee and interest revenue"
          icon={<CircleDollarSign className="h-4 w-4 text-cyan-400" />}
        />
        <SummaryStatCard
          title="Completed Transactions"
          value={String(completedTransactionCount)}
          subtitle="Customer activity completed this month"
          icon={<ArrowRightLeft className="h-4 w-4 text-cyan-400" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-400">
                Liquidity Monitor
              </p>
              <h2 className={`mt-3 text-3xl font-bold ${liquiditySignal.headingClass}`}>
                {liquiditySignal.label}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                {liquiditySignal.summary}
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-400/10 p-3">
              <Landmark className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiMiniCard
              label="Deposit Base"
              value={formatCurrency(withdrawableDeposits)}
              tone="neutral"
            />
            <KpiMiniCard
              label="Funds Lent Out"
              value={formatCurrency(totalLentOut)}
              tone="warning"
            />
            <KpiMiniCard
              label="Liquidity Buffer"
              value={formatSignedCurrency(liquidityBuffer)}
              tone={liquidityBuffer < 0 ? "danger" : "positive"}
            />
            <KpiMiniCard
              label="Loan-to-Deposit"
              value={formatRatio(loanToDepositRatio)}
              tone={
                loanToDepositRatio > 1
                  ? "danger"
                  : loanToDepositRatio > 0.85
                    ? "warning"
                    : "positive"
              }
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <KpiMiniCard
              label="Loan Book"
              value={formatCurrency(outstandingLoanBalance)}
              tone="neutral"
            />
            <KpiMiniCard
              label="Card Balances"
              value={formatCurrency(outstandingCreditBalance)}
              tone="neutral"
            />
            <KpiMiniCard
              label="Card Utilization"
              value={formatPercent(creditUtilization)}
              tone={
                creditUtilization > 0.9
                  ? "danger"
                  : creditUtilization > 0.7
                    ? "warning"
                    : "positive"
              }
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm">
            <TrendPill label="Txn volume vs last month" value={volumeGrowth} />
            <span className="rounded-full bg-slate-950/60 px-3 py-1.5 text-slate-300">
              Active loans: {activeLoanCount}
            </span>
            <span className="rounded-full bg-slate-950/60 px-3 py-1.5 text-slate-300">
              Cards carrying balance: {activeCreditBalanceCount}
            </span>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Directional demo signal only. OCC liquidity guidance and FDIC
            loan-to-deposit concepts are useful operating cues, but no single ratio
            should be treated as a full supervisory grade on its own.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-400">
                Revenue This Month
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                {formatCurrency(currentBankIncome)}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Recognized fee income and interest charges recorded in the bank
                income ledger.
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-400/10 p-3">
              <Wallet className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <KpiMiniCard
              label="Fee Income"
              value={formatCurrency(currentFeeIncome)}
              tone="neutral"
            />
            <KpiMiniCard
              label="Interest Charges"
              value={formatCurrency(currentInterestChargeIncome)}
              tone="neutral"
            />
            <KpiMiniCard
              label="Average Income Entry"
              value={formatCurrency(avgIncomeEntry)}
              tone="positive"
            />
            <KpiMiniCard
              label="Entries Posted"
              value={String(currentIncome.length)}
              tone="neutral"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm">
            <TrendPill label="Income vs last month" value={incomeGrowth} />
            <p className="text-slate-500">
              Last month: {formatCurrency(previousBankIncome)}
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Monthly Activity</h3>
              <p className="mt-1 text-sm text-slate-400">
                Deposits and withdrawals over the last 6 months.
              </p>
            </div>
            <div className="rounded-2xl bg-cyan-400/10 p-3">
              <Activity className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          <div className="grid h-[260px] grid-cols-6 items-end gap-3 sm:gap-4">
            {monthlyBars.map((item) => (
              <div
                key={item.label}
                className="flex h-full flex-col items-center justify-end gap-3"
              >
                <div className="flex h-full items-end gap-2">
                  <div
                    className="w-4 rounded-t-full bg-emerald-400/90"
                    style={{ height: `${item.depositHeight}%` }}
                    title={`Deposit: ${formatCurrency(item.deposit)}`}
                  />
                  <div
                    className="w-4 rounded-t-full bg-amber-400/90"
                    style={{ height: `${item.withdrawHeight}%` }}
                    title={`Withdraw: ${formatCurrency(item.withdraw)}`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiMiniCard
              label="Deposits MTD"
              value={formatCurrency(currentDeposits)}
              tone="positive"
            />
            <KpiMiniCard
              label="Withdrawals MTD"
              value={formatCurrency(currentWithdrawals)}
              tone="warning"
            />
            <KpiMiniCard
              label="Card Purchases MTD"
              value={formatCurrency(currentCardPurchases)}
              tone="neutral"
            />
            <KpiMiniCard
              label="Payments MTD"
              value={formatCurrency(currentPayments)}
              tone="neutral"
            />
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
            <div>
              <h3 className="text-xl font-bold text-white">Account Mix</h3>
              <p className="mt-1 text-sm text-slate-400">
                Distribution across active products only.
              </p>
            </div>

            <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
              <DonutChart
                segments={[
                  { value: accountMix.checking, color: "#22d3ee" },
                  { value: accountMix.saving, color: "#a78bfa" },
                  { value: accountMix.credit, color: "#f59e0b" },
                  { value: accountMix.other, color: "#64748b" },
                ]}
              />

              <div className="w-full space-y-3 text-sm">
                <LegendRow
                  color="bg-cyan-400"
                  label="Checking"
                  value={accountMix.checking}
                />
                <LegendRow
                  color="bg-violet-400"
                  label="Saving"
                  value={accountMix.saving}
                />
                <LegendRow
                  color="bg-amber-400"
                  label="Credit"
                  value={accountMix.credit}
                />
                <LegendRow
                  color="bg-slate-500"
                  label="Other"
                  value={accountMix.other}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white">Operational Snapshot</h3>
              <p className="mt-1 text-sm text-slate-400">
                Cleaner headline metrics with less repetition.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <CompactMetric label="Active customers" value={String(totalCustomers)} />
              <CompactMetric label="Active products" value={String(activeAccounts.length)} />
              <CompactMetric
                label="Average deposit balance"
                value={formatCurrency(avgDepositBalance)}
              />
              <CompactMetric
                label="Average ticket size"
                value={formatCurrency(avgCompletedTicket)}
              />
              <CompactMetric
                label="Largest deposit balance"
                value={formatCurrency(largestDepositBalance)}
              />
              <CompactMetric
                label="Net customer flow"
                value={formatSignedCurrency(netCustomerFlow)}
                accent={netCustomerFlow < 0 ? "text-amber-300" : "text-emerald-300"}
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              These tiles intentionally avoid repeating deposit base, lending
              exposure, or income figures already shown above.
            </p>
          </section>
        </div>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Bank Income History</h3>
            <p className="mt-1 text-sm text-slate-400">
              Recent fee and interest-charge revenue entries recognized by the bank.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-400">
            Latest {recentIncome.length} entries
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {recentIncome.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
            No bank income entries have been recorded yet.
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="hidden grid-cols-[1.3fr_0.8fr_0.9fr_0.7fr] gap-4 border-b border-white/10 bg-slate-950/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Description</span>
              <span>Category</span>
              <span>Reference</span>
              <span className="text-right">Amount</span>
            </div>

            <div className="divide-y divide-white/10">
              {recentIncome.map((entry, index) => (
                <div
                  key={`${entry.reference_number || "income"}-${entry.recognized_at || index}`}
                  className="grid gap-4 px-4 py-4 md:grid-cols-[1.3fr_0.8fr_0.9fr_0.7fr] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {entry.description || "Bank income"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(entry.recognized_at)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-xs uppercase tracking-wide text-slate-500 md:hidden">
                      Category
                    </span>
                    <span className="text-slate-300">
                      {formatIncomeCategory(entry.income_category)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-xs uppercase tracking-wide text-slate-500 md:hidden">
                      Reference
                    </span>
                    <span className="truncate text-slate-400">
                      {entry.reference_number || "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block md:text-right">
                    <span className="text-xs uppercase tracking-wide text-slate-500 md:hidden">
                      Amount
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {formatCurrency(Number(entry.amount || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryStatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#0c162a] p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{value}</h3>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-cyan-400/10 p-3">{icon}</div>
      </div>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function KpiMiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning" | "danger";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "danger"
        ? "text-red-300"
        : tone === "warning"
          ? "text-amber-400"
          : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function TrendPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const positive = value >= 0;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium ${
        positive
          ? "bg-emerald-400/10 text-emerald-300"
          : "bg-red-400/10 text-red-300"
      }`}
    >
      <span>{positive ? "Up" : "Down"}</span>
      <span>{Math.abs(value).toFixed(1)}%</span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
      <div className="inline-flex items-center gap-2 text-slate-300">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        {label}
      </div>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function DonutChart({
  segments,
}: {
  segments: { value: number; color: string }[];
}) {
  const total = Math.max(
    segments.reduce((sum, segment) => sum + segment.value, 0),
    1
  );

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative h-[180px] w-[180px]">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke="#1e293b"
          strokeWidth="14"
        />
        {segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          const dashArray = `${length} ${circumference - length}`;
          const circle = (
            <circle
              key={index}
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke={segment.color}
              strokeWidth="14"
              strokeDasharray={dashArray}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += length;
          return circle;
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm text-slate-400">Active</span>
        <span className="text-3xl font-bold text-white">{total}</span>
      </div>
    </div>
  );
}

function buildAccountMix(accounts: AccountRow[]) {
  let checking = 0;
  let saving = 0;
  let credit = 0;
  let other = 0;

  for (const acc of accounts) {
    const type = (acc.account_type || "").toLowerCase();

    if (type.includes("checking")) checking += 1;
    else if (type.includes("saving")) saving += 1;
    else if (type.includes("credit")) credit += 1;
    else other += 1;
  }

  return { checking, saving, credit, other };
}

function buildMonthlySeries(rows: TxRow[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      deposit: 0,
      withdraw: 0,
    };
  });

  for (const row of rows) {
    if (!row.executed_at) continue;
    const d = new Date(row.executed_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const month = months.find((item) => item.key === key);
    if (!month) continue;

    const type = (row.transaction_type || "").toLowerCase();
    const amount = Number(row.amount || 0);

    if (type === "deposit") month.deposit += amount;
    if (type === "withdraw" || type === "withdrawal") month.withdraw += amount;
  }

  const maxValue = Math.max(
    ...months.flatMap((month) => [month.deposit, month.withdraw]),
    1
  );

  return months.map((month) => ({
    ...month,
    depositHeight: (month.deposit / maxValue) * 100,
    withdrawHeight: (month.withdraw / maxValue) * 100,
  }));
}

function sumAmounts(rows: TxRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function sumByType(rows: TxRow[], types: string[]) {
  return rows
    .filter((row) => types.includes((row.transaction_type || "").toLowerCase()))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function sumIncome(rows: BankIncomeRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function sumIncomeByCategory(rows: BankIncomeRow[], category: string) {
  return rows
    .filter((row) => (row.income_category || "").toLowerCase() === category)
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function isDepositAccount(value: string | null) {
  const normalized = (value || "").toLowerCase();
  return normalized.includes("checking") || normalized.includes("saving");
}

function computeGrowth(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

function assessLiquiditySignal({
  depositBase,
  totalLentOut,
  loanToDepositRatio,
  liquidityBufferRatio,
}: {
  depositBase: number;
  totalLentOut: number;
  loanToDepositRatio: number;
  liquidityBufferRatio: number;
}) {
  if (depositBase <= 0 && totalLentOut <= 0) {
    return {
      label: "Inactive",
      summary: "No active deposit funding or lending exposure has been recorded yet.",
      headingClass: "text-white",
    };
  }

  if (loanToDepositRatio > 1 || liquidityBufferRatio < 0) {
    return {
      label: "Elevated",
      summary:
        "Outstanding lending now exceeds the current deposit base, so liquidity should be reviewed before more credit is extended.",
      headingClass: "text-red-300",
    };
  }

  if (loanToDepositRatio > 0.85 || liquidityBufferRatio < 0.15) {
    return {
      label: "Tight",
      summary:
        "Funding still covers the book, but the buffer is getting thinner and deserves closer monitoring.",
      headingClass: "text-amber-300",
    };
  }

  return {
    label: "Stable",
    summary:
      "Deposit funding still leaves a visible operating buffer after current loan and card exposure.",
    headingClass: "text-emerald-300",
  };
}

function formatIncomeCategory(value: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized === "fee") return "Fee";
  if (normalized === "interest_charge") return "Interest Charge";
  return "Income";
}

function formatRatio(value: number) {
  if (!Number.isFinite(value)) return "N/A";
  return `${value.toFixed(2)}x`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatSignedCurrency(amount: number) {
  const absoluteValue = formatCurrency(Math.abs(amount));

  if (amount > 0) return `+${absoluteValue}`;
  if (amount < 0) return `-${absoluteValue}`;
  return absoluteValue;
}

function formatDateTime(value: string | null) {
  if (!value) return "N/A";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
