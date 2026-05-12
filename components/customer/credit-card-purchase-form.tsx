"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import {
  isValidSecurityCodeFormat,
  normalizeSecurityCode,
} from "@/lib/banking/security-code";
import { parseCurrencyInput } from "@/lib/banking/amount";

type CreditAccount = {
  account_id: string;
  account_name: string;
  account_number: string;
  available_credit: number;
  current_balance: number;
  minimum_payment_due: number;
  payment_due_at: string | null;
  card_brand: string;
  card_last4: string;
  security_code_mode: string;
};

export function CreditCardPurchaseForm({
  accounts,
}: {
  accounts: CreditAccount[];
}) {
  const router = useRouter();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.account_id ?? "");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedAccountData = useMemo(
    () => accounts.find((account) => account.account_id === selectedAccount),
    [accounts, selectedAccount]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const parsedAmount = parseCurrencyInput(amount, {
      fieldLabel: "Amount",
    });

    if (!selectedAccount) {
      setError("Please choose a credit card.");
      return;
    }

    if (!merchant.trim()) {
      setError("Merchant name is required.");
      return;
    }

    if (!parsedAmount.ok) {
      setError(parsedAmount.error);
      return;
    }

    const numericAmount = parsedAmount.value;

    if (!isValidSecurityCodeFormat(securityCode)) {
      setError("Please enter the 3-digit security code for this card.");
      return;
    }

    if (selectedAccountData && numericAmount > selectedAccountData.available_credit) {
      setError("Purchase exceeds available credit.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/customer/credit-cards/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: selectedAccount,
            merchant,
            category,
            amount: numericAmount,
            security_code: securityCode,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Failed to post purchase.");
          return;
        }

        setAmount("");
        setMerchant("");
        setCategory("");
        setSecurityCode("");
        router.refresh();
        setMessage("Credit card purchase posted successfully.");
      } catch {
        setError("Something went wrong while posting the purchase.");
      }
    });
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-[#0f172a] p-8 text-center">
        <h2 className="text-2xl font-bold text-white">No credit card found</h2>
        <p className="mt-2 text-slate-400">
          Open a credit card first to simulate purchases and rewards.
        </p>
        <Link
          href="/customer/accounts"
          className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Go to Accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-[#0f172a] p-6"
      >
        <div>
          <h2 className="text-xl font-bold text-white">Post a Card Purchase</h2>
          <p className="mt-1 text-sm text-slate-400">
            Simulate an approved credit card purchase the way a live bank card would
            post it.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Credit Card</label>
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setError("");
              setMessage("");
              setSecurityCode("");
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          >
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name} - {account.card_brand} - ****{account.card_last4}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Merchant</label>
          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g. Amazon, Starbucks, Delta"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Dining, Travel, Groceries"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Security Code</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            value={securityCode}
            onChange={(e) => {
              setSecurityCode(normalizeSecurityCode(e.target.value));
              setError("");
              setMessage("");
            }}
            placeholder="3-digit code"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
          />
          <p className="text-xs leading-5 text-slate-500">
            {selectedAccountData?.security_code_mode === "legacy_demo"
              ? "This older demo card temporarily uses the last 3 digits from the visible 4-digit card ending. This will be replaced by email-based reset/change in the production app."
              : "Enter the 3-digit security code you set when opening this card. The input stays masked while you type."}
          </p>
        </div>

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
            "Post Purchase"
          )}
        </button>
      </form>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-center gap-3">
            <CreditCard className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Card Snapshot</h3>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Selected Card</p>
            <p className="mt-1 text-base font-semibold text-white">
              {selectedAccountData
                ? `${selectedAccountData.account_name} - ${selectedAccountData.card_brand} - ****${selectedAccountData.card_last4}`
                : "No card selected"}
            </p>

            <p className="mt-4 text-sm text-slate-400">Current Balance</p>
            <p className="mt-1 text-base font-semibold text-white">
              {formatCurrency(selectedAccountData?.current_balance ?? 0)}
            </p>

            <p className="mt-4 text-sm text-slate-400">Available Credit</p>
            <p className="mt-1 text-base font-semibold text-white">
              {formatCurrency(selectedAccountData?.available_credit ?? 0)}
            </p>

            <p className="mt-4 text-sm text-slate-400">Minimum Due</p>
            <p className="mt-1 text-base font-semibold text-white">
              {formatCurrency(selectedAccountData?.minimum_payment_due ?? 0)}
            </p>

            <p className="mt-4 text-sm text-slate-400">Payment Due</p>
            <p className="mt-1 text-base font-semibold text-white">
              {formatDate(selectedAccountData?.payment_due_at ?? null)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

function formatDate(dateString: string | null) {
  if (!dateString) return "TBD";

  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
