"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentAccountOption = {
  account_id: string;
  account_name: string;
  account_number: string;
  balance: number;
  currency: string;
};

export function LoanPaymentForm({
  loanId,
  maxAmount,
  checkingAccounts,
}: {
  loanId: string;
  maxAmount: number;
  checkingAccounts: PaymentAccountOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      loan_id: loanId,
      payment_account_id: formData.get("payment_account_id"),
      amount: Number(formData.get("amount") || 0),
    };

    try {
      const response = await fetch("/api/customer/loans/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to post loan payment.");
      }

      setMessage(data.message || "Loan payment posted.");
      form.reset();
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to post loan payment."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor={`payment-account-${loanId}`}>Pay from checking</Label>
          <select
            id={`payment-account-${loanId}`}
            name="payment_account_id"
            required
            defaultValue={checkingAccounts[0]?.account_id}
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
          <Label htmlFor={`payment-amount-${loanId}`}>Amount</Label>
          <Input
            id={`payment-amount-${loanId}`}
            name="amount"
            type="number"
            min={1}
            max={maxAmount}
            step="0.01"
            required
            className="border-white/10 bg-slate-950 text-white"
            placeholder={maxAmount.toFixed(2)}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-10 rounded-xl bg-emerald-500 px-5 text-slate-950 hover:bg-emerald-400"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Pay Loan"}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
    </form>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}

function maskDigits(value: string | null | undefined) {
  if (!value) return "****";
  return `****${value.slice(-4)}`;
}
