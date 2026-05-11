import { createClient } from "@/lib/supabase/server";
import {
  Wallet,
  Landmark,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  PiggyBank,
  Activity,
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
};

export async function ManagerDashboardStats() {
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
  ] = await Promise.all([
    supabase.from("customers").select("customer_id"),
    supabase.from("accounts").select("account_id, balance, account_type"),
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
  ]);

  const customers = customersData ?? [];
  const accounts = (accountsData ?? []) as AccountRow[];
  const currentTx = (currentTxData ?? []) as TxRow[];
  const previousTx = (previousTxData ?? []) as TxRow[];
  const sixMonthTx = (sixMonthTxData ?? []) as TxRow[];

  const totalCustomers = customers.length;
  const totalAccounts = accounts.length;

  const totalAssets = accounts.reduce(
    (sum, acc) => sum + Number(acc.balance || 0),
    0
  );

  const avgBalance = totalAccounts > 0 ? totalAssets / totalAccounts : 0;
  const largestAccountBalance = accounts.reduce(
    (max, acc) => Math.max(max, Number(acc.balance || 0)),
    0
  );

  const currentDeposits = sumByType(currentTx, ["deposit"]);
  const currentWithdrawals = sumByType(currentTx, ["withdraw", "withdrawal"]);
  const currentVolume = currentDeposits + currentWithdrawals;

  const previousDeposits = sumByType(previousTx, ["deposit"]);
  const previousWithdrawals = sumByType(previousTx, ["withdraw", "withdrawal"]);
  const previousVolume = previousDeposits + previousWithdrawals;

  const growth =
    previousVolume === 0
      ? currentVolume > 0
        ? 100
        : 0
      : ((currentVolume - previousVolume) / previousVolume) * 100;

  const monthlyBars = buildMonthlySeries(sixMonthTx);
  const accountMix = buildAccountMix(accounts);

  const completedTransactionCount = currentTx.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={String(totalCustomers)}
          subtitle="Active customer records"
          icon={<Wallet className="h-5 w-5 text-cyan-400" />}
        />

        <StatCard
          title="Total Accounts"
          value={String(totalAccounts)}
          subtitle="All account types combined"
          icon={<Landmark className="h-5 w-5 text-cyan-400" />}
        />

        <StatCard
          title="Total Assets"
          value={formatCurrency(totalAssets)}
          subtitle="Combined balance across all accounts"
          icon={<TrendingUp className="h-5 w-5 text-cyan-400" />}
        />

        <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-400">Transaction Volume</p>
              <h3 className="mt-3 text-4xl font-bold text-white truncate" title={formatCurrency(currentVolume)}>
                {formatCurrency(currentVolume)}
              </h3>
            </div>

            <div className="rounded-2xl bg-cyan-400/10 p-3 shrink-0">
              <Activity className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2 text-slate-300">
              <span className="inline-flex items-center gap-2 shrink-0">
                <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                Deposits
              </span>
              <span className="font-semibold text-emerald-400 truncate" title={formatCurrency(currentDeposits)}>
                {formatCurrency(currentDeposits)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-slate-300">
              <span className="inline-flex items-center gap-2 shrink-0">
                <ArrowUpRight className="h-4 w-4 text-amber-400" />
                Withdrawals
              </span>
              <span className="font-semibold text-amber-400 truncate" title={formatCurrency(currentWithdrawals)}>
                {formatCurrency(currentWithdrawals)}
              </span>
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p
              className={`text-sm font-semibold ${
                growth >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {growth >= 0 ? "↑" : "↓"} {Math.abs(growth).toFixed(1)}% vs last month
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Last month volume: {formatCurrency(previousVolume)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">
                Cash Flow Overview
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Deposits vs withdrawals over the last 6 months
              </p>
            </div>
          </div>

          <div className="grid h-[280px] grid-cols-6 items-end gap-4">
            {monthlyBars.map((item) => (
              <div key={item.label} className="flex h-full flex-col items-center justify-end gap-3">
                <div className="flex h-full items-end gap-2">
                  <div className="flex h-full items-end">
                    <div
                      className="w-4 rounded-t-full bg-emerald-400/90"
                      style={{ height: `${item.depositHeight}%` }}
                      title={`Deposit: ${formatCurrency(item.deposit)}`}
                    />
                  </div>
                  <div className="flex h-full items-end">
                    <div
                      className="w-4 rounded-t-full bg-amber-400/90"
                      style={{ height: `${item.withdrawHeight}%` }}
                      title={`Withdraw: ${formatCurrency(item.withdraw)}`}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <div className="inline-flex items-center gap-2 text-slate-300">
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              Deposit
            </div>
            <div className="inline-flex items-center gap-2 text-slate-300">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              Withdraw
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-6 shadow-xl">
          <div>
            <h3 className="text-xl font-bold text-white">Account Mix</h3>
            <p className="mt-1 text-sm text-slate-400">
              Distribution by account type
            </p>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <DonutChart
              segments={[
                {
                  value: accountMix.checking,
                  color: "#22d3ee",
                },
                {
                  value: accountMix.saving,
                  color: "#a78bfa",
                },
                {
                  value: accountMix.other,
                  color: "#64748b",
                },
              ]}
            />

            <div className="mt-6 w-full space-y-3 text-sm">
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
                color="bg-slate-500"
                label="Other"
                value={accountMix.other}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InsightCard
          title="Average Balance"
          value={formatCurrency(avgBalance)}
          subtitle="Per account average"
          icon={<PiggyBank className="h-5 w-5 text-cyan-400" />}
        />

        <InsightCard
          title="Completed Transactions"
          value={String(completedTransactionCount)}
          subtitle="Completed this month"
          icon={<CheckCircle2 className="h-5 w-5 text-cyan-400" />}
        />

        <InsightCard
          title="Largest Account Balance"
          value={formatCurrency(largestAccountBalance)}
          subtitle="Highest single account balance"
          icon={<TrendingUp className="h-5 w-5 text-cyan-400" />}
        />
      </div>
    </div>
  );
}

function StatCard({
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
    <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-3 text-4xl font-bold text-white truncate" title={value}>{value}</h3>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-cyan-400/10 p-3 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

function InsightCard({
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
    <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-400">{title}</p>
          <h4 className="mt-3 text-3xl font-bold text-white truncate" title={value}>{value}</h4>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-cyan-400/10 p-3 shrink-0">{icon}</div>
      </div>
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
    <div className="flex items-center justify-between">
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
  let other = 0;

  for (const acc of accounts) {
    const type = (acc.account_type || "").toLowerCase();

    if (type.includes("checking")) checking += 1;
    else if (type.includes("saving")) saving += 1;
    else other += 1;
  }

  return { checking, saving, other };
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
    const month = months.find((m) => m.key === key);
    if (!month) continue;

    const type = (row.transaction_type || "").toLowerCase();
    const amount = Number(row.amount || 0);

    if (type === "deposit") month.deposit += amount;
    if (type === "withdraw" || type === "withdrawal") month.withdraw += amount;
  }

  const maxValue = Math.max(
    ...months.flatMap((m) => [m.deposit, m.withdraw]),
    1
  );

  return months.map((month) => ({
    ...month,
    depositHeight: (month.deposit / maxValue) * 100,
    withdrawHeight: (month.withdraw / maxValue) * 100,
  }));
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}
