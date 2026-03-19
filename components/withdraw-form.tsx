"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Landmark,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Banknote,
} from "lucide-react";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

export function WithdrawForm({ accounts }: { accounts: Account[] }) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedAccountData = useMemo(() => {
    return accounts.find((account) => account.account_id === selectedAccount);
  }, [accounts, selectedAccount]);

  const availableBalance = Number(selectedAccountData?.balance ?? 0);
  const currency = selectedAccountData?.currency ?? "USD";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const numericAmount = Number(amount);

    if (!selectedAccount) {
      setError("Please select an account.");
      return;
    }

    if (!amount || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (numericAmount > availableBalance) {
      setError("Insufficient funds. You cannot withdraw more than your current balance.");
      return;
    }

    const formData = new FormData();
    formData.append("account_id", selectedAccount);
    formData.append("amount", amount);

    startTransition(async () => {
      try {
        const res = await fetch("/api/customer/withdraw", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Withdrawal failed.");
          return;
        }

        setMessage("Withdrawal completed successfully.");
        setAmount("");
      } catch {
        setError("Something went wrong while processing the withdrawal.");
      }
    });
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-[#0f172a] p-8 text-center">
        <h2 className="text-2xl font-bold text-white">No active account found</h2>
        <p className="mt-2 text-slate-400">
          You need to open an account before making a withdrawal.
        </p>
        <a
          href="/customer/accounts"
          className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Go to Accounts
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-[#0f172a] p-6"
      >
        <div>
          <h2 className="text-xl font-bold text-white">Withdrawal Details</h2>
          <p className="mt-1 text-sm text-slate-400">
            Choose an account and enter an amount that does not exceed the current balance.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Select Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setError("");
              setMessage("");
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          >
            <option value="">Choose an account</option>
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name} • {account.account_type} • ****
                {account.account_number?.slice(-4)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
              setMessage("");
            }}
            placeholder="Enter withdrawal amount"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
          />
        </div>

        {selectedAccountData ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm font-medium text-slate-400">Available Balance</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatCurrency(availableBalance, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Account: {selectedAccountData.account_name} • ****
              {selectedAccountData.account_number?.slice(-4)}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
            <AlertCircle size={18} className="mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {message ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
            <CheckCircle2 size={18} className="mt-0.5" />
            <p className="text-sm">{message}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Withdraw Money"
          )}
        </button>
      </form>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-center gap-3">
            <Banknote className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Withdrawal Summary</h3>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Selected Account</p>
            <p className="mt-1 text-base font-semibold text-white">
              {selectedAccountData
                ? `${selectedAccountData.account_name} • ****${selectedAccountData.account_number?.slice(-4)}`
                : "No account selected"}
            </p>

            <p className="mt-4 text-sm text-slate-400">Withdrawal Amount</p>
            <p className="mt-1 text-base font-semibold text-white">
              {amount && Number(amount) > 0
                ? formatCurrency(Number(amount), currency)
                : formatCurrency(0, currency)}
            </p>

            <p className="mt-4 text-sm text-slate-400">Remaining Balance</p>
            <p className="mt-1 text-base font-semibold text-white">
              {selectedAccountData
                ? formatCurrency(
                    Math.max(availableBalance - Number(amount || 0), 0),
                    currency
                  )
                : formatCurrency(0, currency)}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-center gap-3">
            <Landmark className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Important Note</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            For this demo, withdrawals are processed instantly after submission.
            The system will reject any amount greater than the available balance.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}