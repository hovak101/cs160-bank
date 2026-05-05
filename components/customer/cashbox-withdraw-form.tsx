"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { parseCurrencyInput } from "@/lib/banking/amount";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

type CashboxWithdrawFormProps = {
  accounts: Account[];
  cashboxBalance: number;
  embedded?: boolean;
  continueHref?: string;
};

export default function CashboxWithdrawForm({
  accounts,
  cashboxBalance,
  embedded = false,
  continueHref = "/customer/cashbox",
}: CashboxWithdrawFormProps) {
  const router = useRouter();

  const [targetAccountId, setTargetAccountId] = useState(
    accounts[0]?.account_id ?? ""
  );
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const selectedAccount = accounts.find(
    (account) => account.account_id === targetAccountId
  );

  const parsedAmount = parseCurrencyInput(amount, {
    fieldLabel: "CashBox withdrawal amount",
  });
  const numericAmount = parsedAmount.ok ? parsedAmount.value : 0;
  const insufficientCashbox = parsedAmount.ok && numericAmount > cashboxBalance;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!targetAccountId) {
      setError("Please choose an account to receive money.");
      return;
    }

    if (!parsedAmount.ok) {
      setError(parsedAmount.error);
      return;
    }

    if (insufficientCashbox) {
      setError("Insufficient CashBox balance.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/customer/cashbox/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_account_id: targetAccountId,
          amount: numericAmount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to withdraw from CashBox.");
        return;
      }

      setAmount("");
      setSuccessMessage(
        `Moved ${formatCurrency(
          numericAmount
        )} to your account successfully${
          result.reference_number ? ` (${result.reference_number})` : ""
        }.`
      );
      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleContinueCashbox() {
    setShowSuccessModal(false);
    router.push(continueHref);
  }

  function handleGoDashboard() {
    setShowSuccessModal(false);
    router.push("/customer/dashboard");
  }

  return (
    <>
      <div className="space-y-8">
        {!embedded ? (
          <section className="rounded-[32px] border border-white/10 bg-[#0f172a] p-8">
            <h1 className="text-3xl font-bold text-white">
              Withdraw from CashBox
            </h1>
            <p className="mt-2 text-slate-400">
              Move money from your CashBox into one of your active accounts.
            </p>
          </section>
        ) : null}

        <Card className="border-white/10 bg-[#0f172a] p-6">
          <div className="mb-5 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">CashBox Balance</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {formatCurrency(cashboxBalance)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Receive Into
              </label>
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                {accounts.length === 0 ? (
                  <option value="">No active account available</option>
                ) : (
                  accounts.map((account) => (
                    <option key={account.account_id} value={account.account_id}>
                      {(account.account_name || account.account_type).toUpperCase()}{" "}
                      • ****{account.account_number.slice(-4)} • Current:{" "}
                      {formatCurrency(account.balance, account.currency)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Amount
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />

              {selectedAccount ? (
                <p className="mt-2 text-sm text-slate-400">
                  Selected account current balance:{" "}
                  {formatCurrency(
                    selectedAccount.balance,
                    selectedAccount.currency
                  )}
                </p>
              ) : null}

              {insufficientCashbox ? (
                <p className="mt-2 text-sm text-rose-400">
                  Your CashBox does not have enough balance.
                </p>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading || accounts.length === 0}
                className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Processing..." : "Withdraw"}
              </button>

              {!embedded ? (
                <Link
                  href="/customer/cashbox"
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:text-cyan-300"
                >
                  Back to CashBox
                </Link>
              ) : null}
            </div>
          </form>
        </Card>
      </div>

      {showSuccessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#0f172a] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white">Success</h2>
            <p className="mt-3 text-sm text-slate-300">{successMessage}</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleContinueCashbox}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                {embedded ? "Continue in Transfers" : "Continue using CashBox"}
              </button>

              <button
                type="button"
                onClick={handleGoDashboard}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-400/50 hover:text-cyan-300"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}
