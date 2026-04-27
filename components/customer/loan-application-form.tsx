"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { computeLoanAssessment } from "@/lib/banking/loans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_LOAN_AMOUNT = 1_000_000;

type CheckingAccountOption = {
  account_id: string;
  account_name: string;
  account_number: string;
  balance: number;
  currency: string;
};

type FormState = {
  checking_account_id: string;
  principal_amount: string;
  term_months: string;
  monthly_income: string;
  monthly_housing_payment: string;
  existing_credit_debt: string;
  employment_status: string;
  purpose: string;
  other_financial_notes: string;
};

export function LoanApplicationForm({
  checkingAccounts,
  existingCreditDebt,
}: {
  checkingAccounts: CheckingAccountOption[];
  existingCreditDebt: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<FormState>({
    checking_account_id: checkingAccounts[0]?.account_id ?? "",
    principal_amount: "",
    term_months: "24",
    monthly_income: "",
    monthly_housing_payment: "",
    existing_credit_debt: String(existingCreditDebt || 0),
    employment_status: "full_time",
    purpose: "",
    other_financial_notes: "",
  });

  const assessment = useMemo(() => {
    const requestedAmount = Number(form.principal_amount || 0);
    const termMonths = Number(form.term_months || 24);
    const monthlyIncome = Number(form.monthly_income || 0);
    const monthlyHousingPayment = Number(form.monthly_housing_payment || 0);
    const currentCreditDebt = Number(existingCreditDebt || 0);

    if (requestedAmount <= 0 || monthlyIncome <= 0) {
      return null;
    }

    return computeLoanAssessment({
      requestedAmount,
      termMonths,
      monthlyIncome,
      monthlyHousingPayment,
      existingCreditDebt: currentCreditDebt,
      employmentStatus: form.employment_status,
    });
  }, [existingCreditDebt, form]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      checking_account_id: form.checking_account_id,
      principal_amount: Number(form.principal_amount || 0),
      term_months: Number(form.term_months || 0),
      monthly_income: Number(form.monthly_income || 0),
      monthly_housing_payment: Number(form.monthly_housing_payment || 0),
      employment_status: form.employment_status,
      purpose: form.purpose,
      other_financial_notes: form.other_financial_notes,
    };

    try {
      const response = await fetch("/api/customer/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit loan application.");
      }

      setSuccess("Loan application submitted. Admin can review it now.");
      setForm({
        checking_account_id: checkingAccounts[0]?.account_id ?? "",
        principal_amount: "",
        term_months: "24",
        monthly_income: "",
        monthly_housing_payment: "",
        existing_credit_debt: String(existingCreditDebt || 0),
        employment_status: "full_time",
        purpose: "",
        other_financial_notes: "",
      });
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit loan application."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <Card className="border-white/10 bg-[#0f172a] p-6 text-white">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
          Apply For A Loan
        </p>
        <h2 className="mt-2 text-2xl font-bold">Simple demo application</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Fill in a few financial details and the system will estimate your risk, interest, and full bill before admin approval.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="checking_account_id">Deposit checking account</Label>
          <select
            id="checking_account_id"
            name="checking_account_id"
            required
            value={form.checking_account_id}
            onChange={(event) => updateField("checking_account_id", event.target.value)}
            className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            {checkingAccounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name} ({maskDigits(account.account_number)}) -{" "}
                {formatCurrency(account.balance, account.currency)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="principal_amount">Loan amount</Label>
          <Input
            id="principal_amount"
            name="principal_amount"
            type="text"
            inputMode="numeric"
            required
            value={formatNumberInput(form.principal_amount)}
            onChange={(event) =>
              updateField(
                "principal_amount",
                sanitizeWholeDollarInput(event.target.value, MAX_LOAN_AMOUNT)
              )
            }
            className="border-white/10 bg-slate-950 text-white"
            placeholder="10,000"
          />
          <p className="text-xs text-slate-500">
            Maximum loan amount: {formatCurrency(MAX_LOAN_AMOUNT)}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="term_months">Term length</Label>
          <select
            id="term_months"
            name="term_months"
            required
            value={form.term_months}
            onChange={(event) => updateField("term_months", event.target.value)}
            className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            <option value="12">12 months</option>
            <option value="24">24 months</option>
            <option value="36">36 months</option>
            <option value="48">48 months</option>
            <option value="60">60 months</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employment_status">Employment status</Label>
          <select
            id="employment_status"
            name="employment_status"
            required
            value={form.employment_status}
            onChange={(event) => updateField("employment_status", event.target.value)}
            className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="self_employed">Self-employed</option>
            <option value="contract">Contract</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
            <option value="unemployed">Unemployed</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthly_income">Monthly income</Label>
          <Input
            id="monthly_income"
            name="monthly_income"
            type="text"
            inputMode="numeric"
            required
            value={formatNumberInput(form.monthly_income)}
            onChange={(event) =>
              updateField("monthly_income", sanitizeWholeDollarInput(event.target.value))
            }
            className="border-white/10 bg-slate-950 text-white"
            placeholder="4,200"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthly_housing_payment">Monthly housing payment</Label>
          <Input
            id="monthly_housing_payment"
            name="monthly_housing_payment"
            type="text"
            inputMode="numeric"
            value={formatNumberInput(form.monthly_housing_payment)}
            onChange={(event) =>
              updateField(
                "monthly_housing_payment",
                sanitizeWholeDollarInput(event.target.value)
              )
            }
            className="border-white/10 bg-slate-950 text-white"
            placeholder="1,200"
          />
        </div>

        <div className="space-y-2">
          <Label>Credit card debt</Label>
          <div className="flex h-10 w-full items-center rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
            {formatCurrency(existingCreditDebt)}
          </div>
          <p className="text-xs text-slate-500">
            Auto-calculated from your current credit card balances.
          </p>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="purpose">Purpose</Label>
          <textarea
            id="purpose"
            name="purpose"
            rows={3}
            value={form.purpose}
            onChange={(event) => updateField("purpose", event.target.value)}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
            placeholder="Home repair, car purchase, tuition, emergency buffer..."
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="other_financial_notes">Other financial notes</Label>
          <textarea
            id="other_financial_notes"
            name="other_financial_notes"
            rows={3}
            value={form.other_financial_notes}
            onChange={(event) => updateField("other_financial_notes", event.target.value)}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
            placeholder="Optional notes for admin review."
          />
        </div>

        {assessment ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-4 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-400">Loan estimate</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Estimate label="Risk" value={`${assessment.riskTier.toUpperCase()} (${assessment.riskScore}/100)`} />
              <Estimate
                label="APR"
                value={`${assessment.annualInterestRate.toFixed(2)}%`}
              />
              <Estimate
                label="Interest to pay"
                value={formatCurrency(assessment.estimatedTotalInterest)}
              />
              <Estimate
                label="Total bill"
                value={formatCurrency(assessment.estimatedTotalRepayment)}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Estimate
                label="Monthly payment"
                value={formatCurrency(assessment.estimatedMonthlyPayment)}
              />
              <Estimate
                label="Credit card debt used"
                value={formatCurrency(existingCreditDebt)}
              />
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-300 lg:col-span-2">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-300 lg:col-span-2">{success}</p> : null}

        <div className="lg:col-span-2">
          <Button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl bg-cyan-500 px-5 text-slate-950 hover:bg-cyan-400"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send />}
            Submit Loan Request
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Estimate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function maskDigits(value: string | null | undefined) {
  if (!value) return "****";
  return `****${value.slice(-4)}`;
}

function sanitizeWholeDollarInput(value: string, max = Number.MAX_SAFE_INTEGER) {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";

  const numericValue = Number(digitsOnly);
  if (!Number.isFinite(numericValue)) {
    return String(max);
  }

  return String(Math.min(numericValue, max));
}

function formatNumberInput(value: string) {
  if (!value) return "";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
