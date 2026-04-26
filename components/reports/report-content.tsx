"use client";

import { useEffect, useState } from "react";
import {
  Landmark,
  Users,
  Activity,
  DollarSign,
  CreditCard,
  PiggyBank,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
} from "lucide-react";

type ReportData = {
  timeframe: string;
  periodStart: string | null;
  periodEnd: string;
  accounts: {
    openedInPeriod: number;
    totalActive: number;
    totalFrozen: number;
    totalClosed: number;
    byType: { checking: number; saving: number; credit: number };
  };
  transactions: {
    totalCount: number;
    totalAmount: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalTransfers: number;
    byType: Record<string, { count: number; amount: number }>;
  };
  customers: { newRegistrations: number };
  loans: {
    issuedInPeriod: number;
    issuedAmount: number;
    paidOffInPeriod: number;
    currentlyActive: number;
    totalOutstandingPrincipal: number;
  };
  bankIncome: {
    totalFees: number;
    totalInterest: number;
    totalIncome: number;
  };
};

const TIMEFRAMES = [
  { key: "week", label: "Past Week" },
  { key: "month", label: "Past Month" },
  { key: "3months", label: "Past 3 Months" },
  { key: "year", label: "Past Year" },
  { key: "lifetime", label: "Lifetime" },
] as const;

const TX_TYPE_LABELS: Record<string, string> = {
  deposit: "Deposits",
  withdrawal: "Withdrawals",
  atm_deposit: "ATM Deposits",
  atm_withdrawal: "ATM Withdrawals",
  transfer: "Transfers",
  fee: "Fees",
  interest: "Interest",
  bill_payment: "Bill Payments",
  cashbox_send: "Cashbox Send",
  cashbox_withdraw: "Cashbox Withdraw",
  credit_purchase: "Credit Purchases",
  loan_payment: "Loan Payments",
  credit_payment: "Credit Payments",
  loan_disbursement: "Loan Disbursements",
};

const TX_TYPE_COLORS: Record<string, string> = {
  deposit: "#34d399",
  withdrawal: "#fbbf24",
  atm_deposit: "#10b981",
  atm_withdrawal: "#fb923c",
  transfer: "#22d3ee",
  fee: "#f87171",
  interest: "#a78bfa",
  bill_payment: "#fb923c",
  cashbox_send: "#38bdf8",
  cashbox_withdraw: "#2dd4bf",
  credit_purchase: "#e879f9",
  loan_payment: "#4ade80",
  credit_payment: "#facc15",
  loan_disbursement: "#818cf8",
};

export function ReportContent({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  const [timeframe, setTimeframe] = useState("month");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`/api/reports?timeframe=${timeframe}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load report");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <a
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </a>
        <h1 className="mt-2 text-4xl font-bold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aggregate banking metrics for the selected period
        </p>
      </div>

      {/* Timeframe selector */}
      <div className="flex flex-wrap gap-2">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.key}
            onClick={() => setTimeframe(tf.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              timeframe === tf.key
                ? "bg-cyan-500 text-slate-950"
                : "border border-slate-700 bg-[#0b1a33] text-white hover:border-slate-500"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-12 text-center">
          <p className="text-slate-400">Loading report data...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-[28px] border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Report content */}
      {data && !loading && !error && (
        <>
          {/* Section 1: Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="New Accounts"
              value={String(data.accounts.openedInPeriod)}
              subtitle="Opened in period"
              icon={<Landmark className="h-5 w-5 text-cyan-400" />}
            />
            <StatCard
              title="New Customers"
              value={String(data.customers.newRegistrations)}
              subtitle="Registered in period"
              icon={<Users className="h-5 w-5 text-cyan-400" />}
            />
            <StatCard
              title="Total Transacted"
              value={formatCurrency(data.transactions.totalAmount)}
              subtitle={`${data.transactions.totalCount} transactions`}
              icon={<Activity className="h-5 w-5 text-cyan-400" />}
            />
            <StatCard
              title="Bank Income"
              value={formatCurrency(data.bankIncome.totalIncome)}
              subtitle="Fees + interest earned"
              icon={<DollarSign className="h-5 w-5 text-cyan-400" />}
            />
          </div>

          {/* Section 2: Transaction Breakdown */}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
            {/* Deposits / Withdrawals / Transfers */}
            <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white">
                Transaction Breakdown
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Volume by major category
              </p>

              <div className="mt-6 space-y-5">
                <BarRow
                  label="Deposits"
                  amount={data.transactions.totalDeposits}
                  max={Math.max(
                    data.transactions.totalDeposits,
                    data.transactions.totalWithdrawals,
                    data.transactions.totalTransfers,
                    1
                  )}
                  color="bg-emerald-400"
                  icon={
                    <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                  }
                />
                <BarRow
                  label="Withdrawals"
                  amount={data.transactions.totalWithdrawals}
                  max={Math.max(
                    data.transactions.totalDeposits,
                    data.transactions.totalWithdrawals,
                    data.transactions.totalTransfers,
                    1
                  )}
                  color="bg-amber-400"
                  icon={
                    <ArrowUpRight className="h-4 w-4 text-amber-400" />
                  }
                />
                <BarRow
                  label="Transfers"
                  amount={data.transactions.totalTransfers}
                  max={Math.max(
                    data.transactions.totalDeposits,
                    data.transactions.totalWithdrawals,
                    data.transactions.totalTransfers,
                    1
                  )}
                  color="bg-cyan-400"
                  icon={
                    <ArrowLeftRight className="h-4 w-4 text-cyan-400" />
                  }
                />
              </div>
            </div>

            {/* Transaction type donut */}
            <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white">
                Transaction Types
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Distribution by type
              </p>

              <div className="mt-4 flex flex-col items-center">
                <DonutChart
                  segments={Object.entries(data.transactions.byType)
                    .filter(([, v]) => v.count > 0)
                    .map(([type, v]) => ({
                      value: v.count,
                      color: TX_TYPE_COLORS[type] || "#64748b",
                    }))}
                  centerLabel="Transactions"
                  centerValue={data.transactions.totalCount}
                />

                <div className="mt-4 w-full space-y-2 text-sm">
                  {Object.entries(data.transactions.byType)
                    .filter(([, v]) => v.count > 0)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .map(([type, v]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between"
                      >
                        <div className="inline-flex items-center gap-2 text-slate-300">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                TX_TYPE_COLORS[type] || "#64748b",
                            }}
                          />
                          {TX_TYPE_LABELS[type] || type}
                        </div>
                        <span className="font-semibold text-white">
                          {v.count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Account Status & Loan Activity */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Account status */}
            <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white">Account Status</h3>
              <p className="mt-1 text-sm text-slate-400">
                Current snapshot across all accounts
              </p>

              <div className="mt-4 flex flex-col items-center">
                <DonutChart
                  segments={[
                    { value: data.accounts.totalActive, color: "#34d399" },
                    { value: data.accounts.totalFrozen, color: "#38bdf8" },
                    { value: data.accounts.totalClosed, color: "#64748b" },
                  ]}
                  centerLabel="Accounts"
                  centerValue={
                    data.accounts.totalActive +
                    data.accounts.totalFrozen +
                    data.accounts.totalClosed
                  }
                />

                <div className="mt-4 w-full space-y-2 text-sm">
                  <LegendRow
                    color="#34d399"
                    label="Active"
                    value={data.accounts.totalActive}
                  />
                  <LegendRow
                    color="#38bdf8"
                    label="Frozen"
                    value={data.accounts.totalFrozen}
                  />
                  <LegendRow
                    color="#64748b"
                    label="Closed"
                    value={data.accounts.totalClosed}
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="mb-3 text-sm font-medium text-slate-400">
                  By Account Type
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {data.accounts.byType.checking}
                    </p>
                    <p className="text-xs text-slate-400">Checking</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {data.accounts.byType.saving}
                    </p>
                    <p className="text-xs text-slate-400">Saving</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {data.accounts.byType.credit}
                    </p>
                    <p className="text-xs text-slate-400">Credit</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loan activity */}
            <div className="rounded-[28px] border border-white/10 bg-[#0f172a] p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white">Loan Activity</h3>
              <p className="mt-1 text-sm text-slate-400">
                Loan issuance and repayment overview
              </p>

              <div className="mt-6 space-y-5">
                <LoanStat
                  label="Loans Issued"
                  value={String(data.loans.issuedInPeriod)}
                  sub={`${formatCurrency(data.loans.issuedAmount)} disbursed`}
                  icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
                />
                <LoanStat
                  label="Loans Paid Off"
                  value={String(data.loans.paidOffInPeriod)}
                  sub="Fully repaid in period"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-cyan-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M9 12l2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  }
                />
                <LoanStat
                  label="Currently Active"
                  value={String(data.loans.currentlyActive)}
                  sub="Open loans"
                  icon={<CreditCard className="h-5 w-5 text-amber-400" />}
                />
                <div className="border-t border-white/10 pt-4">
                  <LoanStat
                    label="Outstanding Principal"
                    value={formatCurrency(
                      data.loans.totalOutstandingPrincipal
                    )}
                    sub="Total owed on active loans"
                    icon={
                      <PiggyBank className="h-5 w-5 text-violet-400" />
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Income Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Fee Income"
              value={formatCurrency(data.bankIncome.totalFees)}
              subtitle="Transaction & service fees"
              icon={<DollarSign className="h-5 w-5 text-amber-400" />}
            />
            <StatCard
              title="Interest Income"
              value={formatCurrency(data.bankIncome.totalInterest)}
              subtitle="Interest charges earned"
              icon={<TrendingUp className="h-5 w-5 text-violet-400" />}
            />
            <StatCard
              title="Total Income"
              value={formatCurrency(data.bankIncome.totalIncome)}
              subtitle="Combined revenue"
              icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

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
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-3 text-4xl font-bold text-white">{value}</h3>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-cyan-400/10 p-3">{icon}</div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  amount,
  max,
  color,
  icon,
}: {
  label: string;
  amount: number;
  max: number;
  color: string;
  icon: React.ReactNode;
}) {
  const pct = max > 0 ? (amount / max) * 100 : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-2 text-slate-300">
          {icon}
          {label}
        </span>
        <span className="font-semibold text-white">
          {formatCurrency(amount)}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.max(pct, 0.5)}%` }}
        />
      </div>
    </div>
  );
}

function LoanStat({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="rounded-2xl bg-white/5 p-3">{icon}</div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500">{sub}</p>
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
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </div>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: { value: number; color: string }[];
  centerLabel: string;
  centerValue: number;
}) {
  const total = Math.max(
    segments.reduce((sum, s) => sum + s.value, 0),
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
        {segments.map((segment, i) => {
          const length = (segment.value / total) * circumference;
          const dashArray = `${length} ${circumference - length}`;
          const circle = (
            <circle
              key={i}
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
        <span className="text-sm text-slate-400">{centerLabel}</span>
        <span className="text-3xl font-bold text-white">{centerValue}</span>
      </div>
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}
