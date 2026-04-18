import { createClient } from "@/lib/supabase/server";
import {
  CheckCircle2,
  ChevronRight,
  DollarSign,
  HandCoins,
  Landmark,
  LineChart,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";

type TxRow = {
  amount: number | null;
  transaction_type: string | null;
  status: string | null;
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
  credit_accounts:
    | { current_balance: number | null }
    | { current_balance: number | null }[]
    | null;
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
      .select("amount, transaction_type, status, executed_at")
      .gte("executed_at", currentMonthStart.toISOString())
      .lt("executed_at", nextMonthStart.toISOString())
      .eq("status", "completed"),
    supabase
      .from("transactions")
      .select("amount, transaction_type, status, executed_at")
      .gte("executed_at", previousMonthStart.toISOString())
      .lt("executed_at", currentMonthStart.toISOString())
      .eq("status", "completed"),
    supabase
      .from("transactions")
      .select("amount, transaction_type, status, executed_at")
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
      .from("accounts")
      .select("account_id, credit_accounts(current_balance)")
      .eq("account_type", "credit")
      .eq("status", "active"),
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
  const totalAccounts = activeAccounts.length;
  const depositAccounts = activeAccounts.filter((account) =>
    isWithdrawableAccountType(account.account_type)
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
  const currentVolume = currentDeposits + currentWithdrawals;

  const previousDeposits = sumByType(previousTx, ["deposit"]);
  const previousWithdrawals = sumByType(previousTx, ["withdraw", "withdrawal"]);
  const previousVolume = previousDeposits + previousWithdrawals;

  const volumeGrowth =
    previousVolume === 0
      ? currentVolume > 0
        ? 100
        : 0
      : ((currentVolume - previousVolume) / previousVolume) * 100;

  const monthlyBars = buildMonthlySeries(sixMonthTx);
  const accountMix = buildAccountMix(accounts);
  const completedTransactionCount = currentTx.length;

  const currentBankIncome = sumIncome(currentIncome);
  const currentFeeIncome = sumIncomeByCategory(currentIncome, "fee");
  const currentInterestChargeIncome = sumIncomeByCategory(
    currentIncome,
    "interest_charge"
  );
  const activeLoans = loans.filter((loan) => loan.status === "active");
  const activeLoanCount = activeLoans.length;
  const outstandingLoanBalance = activeLoans.reduce(
    (sum, loan) =>
      sum +
      Number(loan.outstanding_principal || 0) +
      Number(loan.accrued_interest || 0),
    0
  );
  const outstandingCreditBalance = creditExposure.reduce((sum, account) => {
    const creditAccount = Array.isArray(account.credit_accounts)
      ? account.credit_accounts[0]
      : account.credit_accounts;

    return sum + Number(creditAccount?.current_balance || 0);
  }, 0);
  const activeCreditBalanceCount = creditExposure.filter((account) => {
    const creditAccount = Array.isArray(account.credit_accounts)
      ? account.credit_accounts[0]
      : account.credit_accounts;

    return Number(creditAccount?.current_balance || 0) > 0;
  }).length;
  const totalLentOut = outstandingLoanBalance + outstandingCreditBalance;
  const estimatedLiquidCash = Math.max(withdrawableDeposits - totalLentOut, 0);
  const liquidityGap = withdrawableDeposits - totalLentOut;
  const potentialShortfall = Math.max(totalLentOut - withdrawableDeposits, 0);
  const withdrawalCoverage =
    withdrawableDeposits > 0
      ? estimatedLiquidCash / withdrawableDeposits
      : totalLentOut > 0
        ? 0
        : 1;
  const loanToDepositRatio =
    withdrawableDeposits > 0
      ? totalLentOut / withdrawableDeposits
      : totalLentOut > 0
        ? Number.POSITIVE_INFINITY
        : 0;
  const bankHealth = assessBankHealth({
    withdrawableDeposits,
    totalLentOut,
    withdrawalCoverage,
    potentialShortfall,
    loanToDepositRatio,
  });
  const previousBankIncome = sumIncome(previousIncome);
  const incomeGrowth =
    previousBankIncome === 0
      ? currentBankIncome > 0
        ? 100
        : 0
      : ((currentBankIncome - previousBankIncome) / previousBankIncome) * 100;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-400">
                Real Cash Position
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                {formatCurrency(withdrawableDeposits)}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Checking and saving balances customers can withdraw today. Loans
                and credit balances are tracked separately below.
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-400/10 p-3">
              <LineChart className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <KpiMiniCard
              label="Transaction Volume"
              value={formatCurrency(currentVolume)}
              tone="neutral"
            />
            <KpiMiniCard
              label="Deposits"
              value={formatCurrency(currentDeposits)}
              tone="positive"
            />
            <KpiMiniCard
              label="Withdrawals"
              value={formatCurrency(currentWithdrawals)}
              tone="warning"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm">
            <TrendPill label="Volume vs last month" value={volumeGrowth} />
            <p className="text-slate-500">
              Last month: {formatCurrency(previousVolume)}
            </p>
            <p className="text-slate-500">
              Estimated liquid cash: {formatCurrency(estimatedLiquidCash)}
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-400">
                Bank Income
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                {formatCurrency(currentBankIncome)}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Fee and interest-charge revenue recognized this month.
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-400/10 p-3">
              <DollarSign className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <KpiMiniCard
              label="Fee Income"
              value={formatCurrency(currentFeeIncome)}
              tone="neutral"
            />
            <KpiMiniCard
              label="Interest Charge"
              value={formatCurrency(currentInterestChargeIncome)}
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactStatCard
          title="Total Customers"
          value={String(totalCustomers)}
          subtitle="Active customer records"
          icon={<Wallet className="h-4 w-4 text-cyan-400" />}
        />
        <CompactStatCard
          title="Total Accounts"
          value={String(totalAccounts)}
          subtitle="Active account records"
          icon={<Landmark className="h-4 w-4 text-cyan-400" />}
        />
        <CompactStatCard
          title="Average Deposit Balance"
          value={formatCurrency(avgDepositBalance)}
          subtitle="Checking + saving only"
          icon={<PiggyBank className="h-4 w-4 text-cyan-400" />}
        />
        <CompactStatCard
          title="Completed Transactions"
          value={String(completedTransactionCount)}
          subtitle="Completed this month"
          icon={<CheckCircle2 className="h-4 w-4 text-cyan-400" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-400">
                Lending Exposure
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                {formatCurrency(totalLentOut)}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Total amount the bank currently has lent out across approved
                loans and active credit card balances.
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-400/10 p-3">
              <HandCoins className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <KpiMiniCard
              label="Loan Bills Due"
              value={formatCurrency(outstandingLoanBalance)}
              tone="warning"
            />
            <KpiMiniCard
              label="Credit Balances"
              value={formatCurrency(outstandingCreditBalance)}
              tone="warning"
            />
            <KpiMiniCard
              label="Interest Income"
              value={formatCurrency(currentInterestChargeIncome)}
              tone="neutral"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1.5 text-cyan-300">
              <span>{activeLoanCount}</span>
              <span>active loans</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/60 px-3 py-1.5 text-slate-300">
              <span>{activeCreditBalanceCount}</span>
              <span>cards carrying balance</span>
            </div>
            <p className="text-slate-500">
              Approved loan bills already include fixed interest for the full term.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-400">
                Bank Health
              </p>
              <h2 className={`mt-3 text-3xl font-bold ${bankHealth.headingClass}`}>
                {bankHealth.label}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {bankHealth.summary}
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-400/10 p-3">
              <Landmark className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <KpiMiniCard
              label="Withdrawable Deposits"
              value={formatCurrency(withdrawableDeposits)}
              tone="neutral"
            />
            <KpiMiniCard
              label="Funds Lent Out"
              value={formatCurrency(totalLentOut)}
              tone="warning"
            />
            <KpiMiniCard
              label="Estimated Liquid Cash"
              value={formatCurrency(estimatedLiquidCash)}
              tone={potentialShortfall > 0 ? "danger" : "positive"}
            />
            <KpiMiniCard
              label="Loan-to-Deposit"
              value={formatPercent(loanToDepositRatio)}
              tone={loanToDepositRatio > 1 ? "danger" : loanToDepositRatio > 0.85 ? "warning" : "positive"}
            />
            <KpiMiniCard
              label="Withdrawal Coverage"
              value={formatPercent(withdrawalCoverage)}
              tone={withdrawalCoverage < 0.2 ? "danger" : withdrawalCoverage < 0.4 ? "warning" : "positive"}
            />
            <KpiMiniCard
              label="Liquidity Gap"
              value={formatSignedCurrency(liquidityGap)}
              tone={liquidityGap < 0 ? "danger" : "positive"}
            />
          </div>

          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              potentialShortfall > 0
                ? "border-red-400/20 bg-red-400/10 text-red-200"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {potentialShortfall > 0
              ? `If every customer tried to withdraw all checking and saving balances now, the bank would face an estimated cash shortfall of ${formatCurrency(
                  potentialShortfall
                )}.`
              : `If every customer withdrew now, the bank still has an estimated liquidity cushion of ${formatCurrency(
                  estimatedLiquidCash
                )}.`}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Demo health view inspired by loan-to-deposit and liquidity coverage
            concepts, not a full regulatory capital or liquidity report.
          </p>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-white">Cash Flow Overview</h3>
            <p className="mt-1 text-sm text-slate-400">
              Deposits and withdrawals over the last 6 months
            </p>
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

          <div className="mt-5 flex flex-wrap gap-5 text-sm">
            <div className="inline-flex items-center gap-2 text-slate-300">
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              Deposits
            </div>
            <div className="inline-flex items-center gap-2 text-slate-300">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              Withdrawals
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
            <div>
              <h3 className="text-xl font-bold text-white">Account Mix</h3>
              <p className="mt-1 text-sm text-slate-400">
                Distribution by account type
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Largest Deposit Balance</p>
                <h3 className="mt-3 text-3xl font-bold text-white">
                  {formatCurrency(largestDepositBalance)}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Highest checking or saving balance currently on record.
                </p>
              </div>
              <div className="rounded-2xl bg-cyan-400/10 p-3">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Bank Income History</h3>
            <p className="mt-1 text-sm text-slate-400">
              Recent fee and interest-charge revenue entries recognized by the
              bank.
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

function CompactStatCard({
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
        <span className="text-sm text-slate-400">Accounts</span>
        <span className="text-3xl font-bold text-white">{total}</span>
      </div>
    </div>
  );
}

function sumByType(rows: TxRow[], types: string[]) {
  return rows
    .filter((row) => types.includes((row.transaction_type || "").toLowerCase()))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
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

function sumIncome(rows: BankIncomeRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function sumIncomeByCategory(rows: BankIncomeRow[], category: string) {
  return rows
    .filter((row) => (row.income_category || "").toLowerCase() === category)
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function isWithdrawableAccountType(value: string | null) {
  const normalized = (value || "").toLowerCase();
  return normalized.includes("checking") || normalized.includes("saving");
}

function assessBankHealth({
  withdrawableDeposits,
  totalLentOut,
  withdrawalCoverage,
  potentialShortfall,
  loanToDepositRatio,
}: {
  withdrawableDeposits: number;
  totalLentOut: number;
  withdrawalCoverage: number;
  potentialShortfall: number;
  loanToDepositRatio: number;
}) {
  if (withdrawableDeposits <= 0 && totalLentOut <= 0) {
    return {
      label: "Idle",
      summary: "No active deposits or lending are on the books yet.",
      headingClass: "text-white",
    };
  }

  if (
    potentialShortfall > 0 ||
    withdrawalCoverage < 0.2 ||
    loanToDepositRatio > 1
  ) {
    return {
      label: "Risky",
      summary:
        "Lending is consuming too much of the deposit base, so a full withdrawal wave would likely stress cash availability.",
      headingClass: "text-red-300",
    };
  }

  if (withdrawalCoverage < 0.4 || loanToDepositRatio > 0.85) {
    return {
      label: "Watch",
      summary:
        "The bank is still functioning, but liquidity is getting tighter and should be monitored before more lending is approved.",
      headingClass: "text-amber-300",
    };
  }

  return {
    label: "Healthy",
    summary:
      "Liquid cash still covers a meaningful share of deposits, so the current lending book looks manageable for this demo bank.",
    headingClass: "text-emerald-300",
  };
}

function formatIncomeCategory(value: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized === "fee") return "Fee";
  if (normalized === "interest_charge") return "Interest Charge";
  return "Income";
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
