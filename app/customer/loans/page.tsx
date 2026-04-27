import { redirect } from "next/navigation";
import { FileText, HandCoins, ShieldCheck } from "lucide-react";
import { LoanApplicationForm } from "@/components/customer/loan-application-form";
import { LoanPaymentForm } from "@/components/customer/loan-payment-form";
import { Card } from "@/components/ui/card";
import {
  computeLoanOutstandingAmount,
  computeLoanTotalInterest,
  getEmploymentStatusLabel,
} from "@/lib/banking/loans";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckingAccount = {
  account_id: string;
  account_name: string;
  account_number: string;
  balance: number;
  currency: string;
};

type LoanRow = {
  accrued_interest: number | null;
  annual_interest_rate: number | null;
  created_at: string;
  debt_to_income_ratio: number | null;
  employment_status: string | null;
  estimated_monthly_payment: number | null;
  loan_id: string;
  other_financial_notes: string | null;
  outstanding_principal: number | null;
  principal_amount: number | null;
  purpose: string | null;
  recommended_decision: string | null;
  risk_score: number | null;
  risk_summary: string | null;
  risk_tier: string | null;
  status: string | null;
  term_months: number | null;
  total_paid: number | null;
};

export default async function CustomerLoansPage() {
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

  const [checkingAccountsResult, creditAccountsResult, loansResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("account_id, account_name, account_number, balance, currency")
      .eq("customer_id", customer.customer_id)
      .eq("account_type", "checking")
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    supabase
      .from("accounts")
      .select("account_id, credit_accounts(current_balance)")
      .eq("customer_id", customer.customer_id)
      .eq("account_type", "credit")
      .eq("status", "active"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("loans")
      .select("*")
      .eq("customer_id", customer.customer_id)
      .order("created_at", { ascending: false }),
  ]);

  const checkingAccounts: CheckingAccount[] = (checkingAccountsResult.data ?? []).map(
    (account) => ({
      account_id: account.account_id,
      account_name: account.account_name ?? "Checking",
      account_number: account.account_number ?? "",
      balance: Number(account.balance ?? 0),
      currency: account.currency ?? "USD",
    })
  );
  const existingCreditDebt = (creditAccountsResult.data ?? []).reduce((sum, account) => {
    const creditAccount = Array.isArray(account.credit_accounts)
      ? account.credit_accounts[0]
      : account.credit_accounts;
    return sum + Number(creditAccount?.current_balance ?? 0);
  }, 0);

  const loans: LoanRow[] = (loansResult.data ?? []).map((loan: LoanRow) => ({
    ...loan,
    accrued_interest: Number(loan.accrued_interest ?? 0),
    annual_interest_rate: Number(loan.annual_interest_rate ?? 0),
    debt_to_income_ratio: Number(loan.debt_to_income_ratio ?? 0),
    estimated_monthly_payment: Number(loan.estimated_monthly_payment ?? 0),
    outstanding_principal: Number(loan.outstanding_principal ?? 0),
    principal_amount: Number(loan.principal_amount ?? 0),
    risk_score: Number(loan.risk_score ?? 0),
    term_months: Number(loan.term_months ?? 0),
    total_paid: Number(loan.total_paid ?? 0),
  }));

  const activeLoans = loans.filter((loan) => loan.status === "active");
  const pendingLoans = loans.filter((loan) => loan.status === "pending");
  const totalOutstanding = activeLoans.reduce(
    (sum, loan) => sum + computeLoanOutstandingAmount(loan),
    0
  );
  const totalBorrowed = loans.reduce(
    (sum, loan) => sum + Number(loan.principal_amount || 0),
    0
  );

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            Lending
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">Loans</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Request a simple demo loan, see the interest included in the total bill, and repay from checking.
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard
          icon={<FileText className="h-5 w-5 text-cyan-300" />}
          title="Pending"
          value={String(pendingLoans.length)}
          subtitle="Applications waiting for admin review"
        />
        <MetricCard
          icon={<HandCoins className="h-5 w-5 text-cyan-300" />}
          title="Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle="Current total bill left on active loans"
        />
        <MetricCard
          icon={<ShieldCheck className="h-5 w-5 text-cyan-300" />}
          title="Total Requested"
          value={formatCurrency(totalBorrowed)}
          subtitle="All loan requests submitted from this profile"
        />
      </div>

      {checkingAccounts.length === 0 ? (
        <Card className="border-white/10 bg-[#0f172a] p-8 text-center text-slate-300">
          Open an active checking account first so approved loans have a place to deposit.
        </Card>
      ) : (
        <LoanApplicationForm
          checkingAccounts={checkingAccounts}
          existingCreditDebt={existingCreditDebt}
        />
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Your loan activity</h2>
          <p className="mt-1 text-sm text-slate-400">
            Status, score, APR, interest amount, and total bill for each request.
          </p>
        </div>

        {loans.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-[#0f172a] p-8 text-center text-slate-300">
            No loan requests yet.
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {loans.map((loan) => {
              const estimatedInterest = computeLoanTotalInterest(
                Number(loan.principal_amount || 0),
                Number(loan.annual_interest_rate || 0),
                Number(loan.term_months || 0)
              );
              const interestToPay =
                loan.status === "active" || loan.status === "paid"
                  ? Number(loan.accrued_interest || 0)
                  : estimatedInterest;
              const principalLeft =
                loan.status === "active" || loan.status === "paid"
                  ? Number(loan.outstanding_principal || 0)
                  : Number(loan.principal_amount || 0);
              const totalBill =
                loan.status === "active" || loan.status === "paid"
                  ? computeLoanOutstandingAmount(loan)
                  : principalLeft + interestToPay;

              return (
                <Card key={loan.loan_id} className="border-white/10 bg-[#0f172a] p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-cyan-400">
                        {formatStatus(loan.status)}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold">
                        {formatCurrency(Number(loan.principal_amount || 0))}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {loan.term_months} months -{" "}
                        {Number(loan.annual_interest_rate || 0).toFixed(2)}% APR
                      </p>
                    </div>

                    <div className="text-right">
                      <RiskBadge tier={loan.risk_tier || "bad"} />
                      <p className="mt-2 text-sm text-slate-400">
                        Score {loan.risk_score}/100
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MiniMetric
                      label="Monthly payment"
                      value={formatCurrency(Number(loan.estimated_monthly_payment || 0))}
                    />
                    <MiniMetric
                      label="Interest to pay"
                      value={formatCurrency(interestToPay)}
                    />
                    <MiniMetric label="Total bill" value={formatCurrency(totalBill)} />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                    <p>Employment: {getEmploymentStatusLabel(loan.employment_status)}</p>
                    <p className="mt-1">Recommended: {formatDecision(loan.recommended_decision)}</p>
                    <p className="mt-1">Submitted: {formatDate(loan.created_at)}</p>
                    <p className="mt-1">Principal left: {formatCurrency(principalLeft)}</p>
                    <p className="mt-1">Interest portion: {formatCurrency(interestToPay)}</p>
                    <p className="mt-1">Outstanding total: {formatCurrency(totalBill)}</p>
                    {loan.purpose ? <p className="mt-3">Purpose: {loan.purpose}</p> : null}
                    {loan.other_financial_notes ? (
                      <p className="mt-2 text-slate-500">Notes: {loan.other_financial_notes}</p>
                    ) : null}
                  </div>

                  {loan.status === "active" && checkingAccounts.length > 0 ? (
                    <div className="mt-5">
                      <LoanPaymentForm
                        loanId={loan.loan_id}
                        maxAmount={totalBill}
                        checkingAccounts={checkingAccounts}
                      />
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card className="border-white/10 bg-[#0f172a] p-6 text-white">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
        <div className="rounded-xl bg-cyan-400/10 p-2">{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function RiskBadge({ tier }: { tier: string }) {
  const className =
    tier === "good"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : tier === "review"
      ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
      : "border-rose-400/30 bg-rose-500/10 text-rose-200";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase ${className}`}
    >
      {tier}
    </span>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}

function formatDecision(value: string | null | undefined) {
  if (value === "approve") return "Approve";
  if (value === "review") return "Needs review";
  return "Decline";
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatus(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
