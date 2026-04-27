"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { computeLoanTotalInterest } from "@/lib/banking/loans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type AdminLoanView = {
  accrued_interest: number;
  admin_decision_notes: string | null;
  annual_interest_rate: number;
  checking_account_label: string;
  created_at: string;
  customer_name: string;
  debt_to_income_ratio: number;
  employment_status_label: string;
  estimated_monthly_payment: number;
  existing_credit_debt: number;
  loan_id: string;
  monthly_housing_payment: number;
  monthly_income: number;
  other_financial_notes: string | null;
  outstanding_principal: number;
  principal_amount: number;
  purpose: string | null;
  recommended_decision: string;
  reviewed_at: string | null;
  risk_score: number;
  risk_summary: string | null;
  risk_tier: string;
  status: string;
  term_months: number;
  total_paid: number;
};

export function LoanReviewPanel({ loans }: { loans: AdminLoanView[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loadingLoanId, setLoadingLoanId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pendingLoans = useMemo(
    () => loans.filter((loan) => loan.status === "pending"),
    [loans]
  );
  const portfolioLoans = useMemo(
    () => loans.filter((loan) => loan.status !== "pending"),
    [loans]
  );

  async function reviewLoan(loanId: string, action: "approve" | "reject") {
    try {
      setError("");
      setLoadingLoanId(loanId);

      const response = await fetch(`/api/admin/loans/${loanId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          admin_decision_notes: notes[loanId] || "",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to review loan.");
      }

      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to review loan."
      );
    } finally {
      setLoadingLoanId(null);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Pending applications</h2>
          <p className="mt-1 text-sm text-slate-400">
            System scoring is only a recommendation. Admin can still approve or reject after review.
          </p>
        </div>

        {pendingLoans.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-[#0f172a] p-8 text-center text-slate-300">
            No pending loan applications right now.
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {pendingLoans.map((loan) => {
              const isLoading = loadingLoanId === loan.loan_id;
              const estimatedInterest = computeLoanTotalInterest(
                loan.principal_amount,
                loan.annual_interest_rate,
                loan.term_months
              );
              const estimatedTotalBill = loan.principal_amount + estimatedInterest;

              return (
                <Card key={loan.loan_id} className="border-white/10 bg-[#0f172a] p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-cyan-400">
                        {loan.customer_name}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold">
                        {formatCurrency(loan.principal_amount)}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {loan.term_months} months - {loan.annual_interest_rate.toFixed(2)}% APR
                      </p>
                    </div>

                    <div className="text-right">
                      <Badge tone={toneFromTier(loan.risk_tier)}>
                        {loan.risk_tier.toUpperCase()}
                      </Badge>
                      <p className="mt-2 text-sm text-slate-400">Score {loan.risk_score}/100</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Metric label="Monthly income" value={formatCurrency(loan.monthly_income)} />
                    <Metric label="Housing" value={formatCurrency(loan.monthly_housing_payment)} />
                    <Metric label="Credit debt" value={formatCurrency(loan.existing_credit_debt)} />
                    <Metric label="Projected payment" value={formatCurrency(loan.estimated_monthly_payment)} />
                    <Metric label="Estimated interest" value={formatCurrency(estimatedInterest)} />
                    <Metric label="Total bill" value={formatCurrency(estimatedTotalBill)} />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      System recommendation
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {formatDecision(loan.recommended_decision)}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {loan.risk_summary || "No summary available."}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                      <p>Employment: {loan.employment_status_label}</p>
                      <p>DTI: {(loan.debt_to_income_ratio * 100).toFixed(1)}%</p>
                      <p>Checking: {loan.checking_account_label}</p>
                      <p>Submitted: {formatDate(loan.created_at)}</p>
                    </div>
                    {loan.purpose ? (
                      <p className="mt-3 text-sm text-slate-300">Purpose: {loan.purpose}</p>
                    ) : null}
                    {loan.other_financial_notes ? (
                      <p className="mt-2 text-sm text-slate-400">
                        Notes: {loan.other_financial_notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Admin notes
                    </label>
                    <textarea
                      rows={3}
                      value={notes[loan.loan_id] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [loan.loan_id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                      placeholder="Optional approval/rejection notes..."
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      disabled={isLoading}
                      onClick={() => reviewLoan(loan.loan_id, "approve")}
                      className="rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : "Approve"}
                    </Button>
                    <Button
                      disabled={isLoading}
                      onClick={() => reviewLoan(loan.loan_id, "reject")}
                      variant="outline"
                      className="rounded-xl border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : "Reject"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Loan portfolio</h2>
          <p className="mt-1 text-sm text-slate-400">
            Active, rejected, and paid loans stay visible here for demo reporting.
          </p>
        </div>

        {portfolioLoans.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-[#0f172a] p-8 text-center text-slate-300">
            No reviewed loans yet.
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {portfolioLoans.map((loan) => {
              const outstanding = loan.outstanding_principal + loan.accrued_interest;

              return (
                <Card key={loan.loan_id} className="border-white/10 bg-[#0f172a] p-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-cyan-400">
                        {loan.customer_name}
                      </p>
                      <h3 className="mt-2 text-xl font-bold">
                        {formatCurrency(loan.principal_amount)}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {loan.term_months} months - {loan.annual_interest_rate.toFixed(2)}% APR
                      </p>
                    </div>
                    <Badge tone={toneFromStatus(loan.status)}>{loan.status.toUpperCase()}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Metric label="Total bill left" value={formatCurrency(outstanding)} />
                    <Metric label="Interest to pay" value={formatCurrency(loan.accrued_interest)} />
                    <Metric label="Principal left" value={formatCurrency(loan.outstanding_principal)} />
                    <Metric label="Total paid" value={formatCurrency(loan.total_paid)} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                    <p>Checking: {loan.checking_account_label}</p>
                    <p className="mt-1">Recommended: {formatDecision(loan.recommended_decision)}</p>
                    <p className="mt-1">Reviewed: {formatDate(loan.reviewed_at)}</p>
                    {loan.admin_decision_notes ? (
                      <p className="mt-2 text-slate-400">Admin notes: {loan.admin_decision_notes}</p>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "good" | "review" | "bad" | "active" | "neutral";
}) {
  const className =
    tone === "good"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : tone === "review"
      ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
      : tone === "bad"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : tone === "active"
      ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
      : "border-white/10 bg-white/5 text-slate-200";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function toneFromTier(tier: string) {
  if (tier === "good") return "good";
  if (tier === "review") return "review";
  return "bad";
}

function toneFromStatus(status: string) {
  if (status === "active") return "active";
  if (status === "rejected") return "bad";
  if (status === "paid") return "good";
  return "neutral";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDecision(value: string) {
  if (value === "approve") return "Approve";
  if (value === "review") return "Needs Review";
  return "Decline";
}
