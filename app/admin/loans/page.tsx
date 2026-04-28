import { redirect } from "next/navigation";
import { CircleDollarSign, FileClock, Wallet } from "lucide-react";
import { LoanReviewPanel, type AdminLoanView } from "@/components/admin/loan-review-panel";
import { Card } from "@/components/ui/card";
import {
  computeLoanOutstandingAmount,
  getEmploymentStatusLabel,
} from "@/lib/banking/loans";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LoanRecord = {
  accrued_interest: number | null;
  admin_decision_notes: string | null;
  annual_interest_rate: number | null;
  checking_account_id: string;
  created_at: string;
  customer_id: string;
  debt_to_income_ratio: number | null;
  employment_status: string | null;
  estimated_monthly_payment: number | null;
  existing_credit_debt: number | null;
  loan_id: string;
  monthly_housing_payment: number | null;
  monthly_income: number | null;
  other_financial_notes: string | null;
  outstanding_principal: number | null;
  principal_amount: number | null;
  purpose: string | null;
  recommended_decision: string | null;
  reviewed_at: string | null;
  risk_score: number | null;
  risk_summary: string | null;
  risk_tier: string | null;
  status: string | null;
  term_months: number | null;
  total_paid: number | null;
};

export default async function AdminLoansPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (userData?.role !== "admin") redirect("/auth/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: loansResult, error: loansError } = await (supabase as any)
    .from("loans")
    .select("*")
    .order("created_at", { ascending: false });

  if (loansError) {
    throw new Error(loansError.message || "Failed to load loans.");
  }

  const rawLoans: LoanRecord[] = (loansResult ?? []).map((loan: LoanRecord) => ({
    ...loan,
    accrued_interest: Number(loan.accrued_interest ?? 0),
    annual_interest_rate: Number(loan.annual_interest_rate ?? 0),
    debt_to_income_ratio: Number(loan.debt_to_income_ratio ?? 0),
    estimated_monthly_payment: Number(loan.estimated_monthly_payment ?? 0),
    existing_credit_debt: Number(loan.existing_credit_debt ?? 0),
    monthly_housing_payment: Number(loan.monthly_housing_payment ?? 0),
    monthly_income: Number(loan.monthly_income ?? 0),
    outstanding_principal: Number(loan.outstanding_principal ?? 0),
    principal_amount: Number(loan.principal_amount ?? 0),
    risk_score: Number(loan.risk_score ?? 0),
    term_months: Number(loan.term_months ?? 0),
    total_paid: Number(loan.total_paid ?? 0),
  }));

  const customerIds = Array.from(new Set(rawLoans.map((loan) => loan.customer_id)));
  const checkingAccountIds = Array.from(
    new Set(rawLoans.map((loan) => loan.checking_account_id))
  );

  const [customersResult, checkingAccountsResult] = await Promise.all([
    customerIds.length > 0
      ? supabase
          .from("customers")
          .select("customer_id, first_name, last_name")
          .in("customer_id", customerIds)
      : Promise.resolve({
          data: [] as Array<{
            customer_id: string;
            first_name: string | null;
            last_name: string | null;
          }>,
        }),
    checkingAccountIds.length > 0
      ? supabase
          .from("accounts")
          .select("account_id, account_name, account_number")
          .in("account_id", checkingAccountIds)
      : Promise.resolve({
          data: [] as Array<{
            account_id: string;
            account_name: string | null;
            account_number: string | null;
          }>,
        }),
  ]);

  const customerMap = new Map(
    (customersResult.data ?? []).map((customer) => [
      customer.customer_id,
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer",
    ])
  );
  const checkingAccountMap = new Map(
    (checkingAccountsResult.data ?? []).map((account) => [
      account.account_id,
      `${account.account_name || "Checking"} (${maskDigits(account.account_number)})`,
    ])
  );

  const loans: AdminLoanView[] = rawLoans.map((loan) => ({
    accrued_interest: Number(loan.accrued_interest || 0),
    admin_decision_notes: loan.admin_decision_notes,
    annual_interest_rate: Number(loan.annual_interest_rate || 0),
    checking_account_label:
      checkingAccountMap.get(loan.checking_account_id) || "Checking account",
    created_at: loan.created_at,
    customer_name: customerMap.get(loan.customer_id) || "Customer",
    debt_to_income_ratio: Number(loan.debt_to_income_ratio || 0),
    employment_status_label: getEmploymentStatusLabel(loan.employment_status),
    estimated_monthly_payment: Number(loan.estimated_monthly_payment || 0),
    existing_credit_debt: Number(loan.existing_credit_debt || 0),
    loan_id: loan.loan_id,
    monthly_housing_payment: Number(loan.monthly_housing_payment || 0),
    monthly_income: Number(loan.monthly_income || 0),
    other_financial_notes: loan.other_financial_notes,
    outstanding_principal: Number(loan.outstanding_principal || 0),
    principal_amount: Number(loan.principal_amount || 0),
    purpose: loan.purpose,
    recommended_decision: loan.recommended_decision || "decline",
    reviewed_at: loan.reviewed_at,
    risk_score: Number(loan.risk_score || 0),
    risk_summary: loan.risk_summary,
    risk_tier: loan.risk_tier || "bad",
    status: loan.status || "pending",
    term_months: Number(loan.term_months || 0),
    total_paid: Number(loan.total_paid || 0),
  }));

  const pendingCount = loans.filter((loan) => loan.status === "pending").length;
  const activeCount = loans.filter((loan) => loan.status === "active").length;
  const totalOutstanding = loans
    .filter((loan) => loan.status === "active")
    .reduce(
      (sum, loan) =>
        sum +
        computeLoanOutstandingAmount({
          outstanding_principal: loan.outstanding_principal,
          accrued_interest: loan.accrued_interest,
        }),
      0
    );

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0c162a] p-6 shadow-2xl lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#22d3ee22,transparent_38%),radial-gradient(circle_at_right,#1d4ed833,transparent_34%)]" />

        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-teal-400">
            Admin Lending
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white lg:text-[2.5rem]">
            Loans Review Center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 lg:text-base">
            Review applications, approve disbursements into checking, and monitor the full bill customers must repay.
          </p>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard
          icon={<FileClock className="h-5 w-5 text-cyan-300" />}
          title="Pending Reviews"
          value={String(pendingCount)}
          subtitle="Applications waiting for approval"
        />
        <MetricCard
          icon={<Wallet className="h-5 w-5 text-cyan-300" />}
          title="Active Loans"
          value={String(activeCount)}
          subtitle="Currently disbursed loans"
        />
        <MetricCard
          icon={<CircleDollarSign className="h-5 w-5 text-cyan-300" />}
          title="Outstanding Due"
          value={formatCurrency(totalOutstanding)}
          subtitle="Total bill still owed across active loans"
        />
      </div>

      <LoanReviewPanel loans={loans} />
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

function maskDigits(value: string | null | undefined) {
  if (!value) return "****";
  return `****${value.slice(-4)}`;
}
