"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Landmark,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  getAccountTypeLabel,
  isCreditAccount,
  isSavingsAccount,
  roundCurrency,
} from "@/lib/banking/rules";
import {
  MAX_ACCOUNT_BALANCE,
  parseCurrencyInput,
  willExceedMaxAccountBalance,
} from "@/lib/banking/amount";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

export function TransferForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [accountSnapshots, setAccountSnapshots] = useState(accounts);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAccountSnapshots(accounts);
  }, [accounts]);

  const sourceAccounts = useMemo(
    () =>
      accountSnapshots.filter(
        (account) =>
          (account.status || "").toLowerCase() === "active" &&
          !isCreditAccount(account.account_type)
      ),
    [accountSnapshots]
  );

  const fromAccountData = useMemo(() => {
    return accountSnapshots.find((account) => account.account_id === fromAccount);
  }, [accountSnapshots, fromAccount]);

  const toAccountData = useMemo(() => {
    return accountSnapshots.find((account) => account.account_id === toAccount);
  }, [accountSnapshots, toAccount]);

  const destinationAccounts = useMemo(
    () =>
      accountSnapshots.filter(
        (account) =>
          (account.status || "").toLowerCase() === "active" &&
          account.account_id !== fromAccount
      ),
    [accountSnapshots, fromAccount]
  );

  const availableBalance = Number(fromAccountData?.balance ?? 0);
  const currency = fromAccountData?.currency ?? "USD";
  const isCreditPayment =
    !!toAccountData && isCreditAccount(toAccountData.account_type);
  const parsedAmount = parseCurrencyInput(amount, {
    fieldLabel: "Amount",
  });
  const numericAmount = parsedAmount.ok ? parsedAmount.value : 0;
  const projectedDestinationBalance =
    toAccountData && !isCreditPayment
      ? roundCurrency(Number(toAccountData.balance || 0) + numericAmount)
      : 0;
  const willOverflowDestination =
    !!toAccountData &&
    !isCreditPayment &&
    parsedAmount.ok &&
    willExceedMaxAccountBalance(Number(toAccountData.balance || 0), numericAmount);

  async function refreshAccountSnapshots() {
    const response = await fetch("/api/accounts", {
      method: "GET",
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.accounts)) {
      throw new Error(data.error || "Could not refresh account balances.");
    }

    const nextAccounts = data.accounts.map((account: Account) => ({
      ...account,
      balance: Number(account.balance ?? 0),
    }));
    setAccountSnapshots(nextAccounts);
    return nextAccounts as Account[];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!fromAccount) {
      setError("Please select a source account.");
      return;
    }

    if (!toAccount) {
      setError("Please select a destination account.");
      return;
    }

    if (fromAccount === toAccount) {
      setError("Source and destination accounts must be different.");
      return;
    }

    if (!parsedAmount.ok) {
      setError(parsedAmount.error);
      return;
    }


    startTransition(async () => {
      try {
        const latestAccounts = await refreshAccountSnapshots();
        const latestFromAccount = latestAccounts.find(
          (account) => account.account_id === fromAccount
        );
        const latestToAccount = latestAccounts.find(
          (account) => account.account_id === toAccount
        );

        if (!latestFromAccount || !latestToAccount) {
          setError("We could not refresh your account data. Please try again.");
          return;
        }

        if (numericAmount > Number(latestFromAccount.balance ?? 0)) {
          setError(
            "Your account balance changed. Insufficient funds for this transfer now."
          );
          router.refresh();
          return;
        }

        if (
          !isCreditAccount(latestToAccount.account_type) &&
          willExceedMaxAccountBalance(
            Number(latestToAccount.balance ?? 0),
            numericAmount
          )
        ) {
          setError(
            `Destination account cannot exceed ${formatCurrency(MAX_ACCOUNT_BALANCE)}.`
          );
          return;
        }

        const formData = new FormData();
        formData.append("from_account_id", fromAccount);
        formData.append("to_account_id", toAccount);
        formData.append("amount", amount);

        const res = await fetch("/api/customer/transfer", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Transfer failed.");
          return;
        }

        setAmount("");
        router.refresh();
        setMessage(
          isCreditPayment
            ? "Credit card payment completed successfully."
            : "Transfer completed successfully."
        );
      } catch {
        setError("Something went wrong while processing the transfer.");
      }
    });
  };

  if (sourceAccounts.length === 0 || accounts.length < 2) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-[#0f172a] p-8 text-center">
        <h2 className="text-2xl font-bold text-white">
          Not enough eligible accounts
        </h2>
        <p className="mt-2 text-slate-400">
          You need at least one active checking or savings account plus another active account to make a transfer or credit payment.
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
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-[#0f172a] p-6"
      >
        <div>
          <h2 className="text-xl font-bold text-white">Transfer Details</h2>
          <p className="mt-1 text-sm text-slate-400">
            Move money between deposit accounts or pay your credit card from checking or savings.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            From Account
          </label>
          <select
            value={fromAccount}
            onChange={(e) => {
              const value = e.target.value;
              setFromAccount(value);
              if (value === toAccount) setToAccount("");
              setError("");
              setMessage("");
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          >
            <option value="">Choose source account</option>
            {sourceAccounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name} • {getAccountTypeLabel(account.account_type)} • ****
                {account.account_number?.slice(-4)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            To Account
          </label>
          <select
            value={toAccount}
            onChange={(e) => {
              setToAccount(e.target.value);
              setError("");
              setMessage("");
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          >
            <option value="">Choose destination account</option>
            {destinationAccounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name} • {getAccountTypeLabel(account.account_type)} • ****
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
            placeholder="Enter transfer amount"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
          />
        </div>

        {fromAccountData ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm font-medium text-slate-400">Available Balance</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatCurrency(availableBalance, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Account: {fromAccountData.account_name} • ****
              {fromAccountData.account_number?.slice(-4)}
            </p>
            {isSavingsAccount(fromAccountData.account_type) ? (
              <p className="mt-2 text-xs text-amber-300">
                Savings transfers count toward your 10% monthly withdrawal allowance.
              </p>
            ) : null}
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
          ) : isCreditPayment ? (
            "Pay Credit Card"
          ) : (
            "Transfer Money"
          )}
        </button>
      </form>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Transfer Summary</h3>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">From Account</p>
            <p className="mt-1 text-base font-semibold text-white">
              {fromAccountData
                ? `${fromAccountData.account_name} • ****${fromAccountData.account_number?.slice(-4)}`
                : "No account selected"}
            </p>

            <p className="mt-4 text-sm text-slate-400">To Account</p>
            <p className="mt-1 text-base font-semibold text-white">
              {toAccountData
                ? `${toAccountData.account_name} • ****${toAccountData.account_number?.slice(-4)}`
                : "No account selected"}
            </p>

            <p className="mt-4 text-sm text-slate-400">Transfer Type</p>
            <p className="mt-1 text-base font-semibold text-white">
              {isCreditPayment ? "Credit Card Payment" : "Internal Transfer"}
            </p>

            <p className="mt-4 text-sm text-slate-400">Transfer Amount</p>
            <p className="mt-1 text-base font-semibold text-white">
              {parsedAmount.ok
                ? formatCurrency(numericAmount, currency)
                : formatCurrency(0, currency)}
            </p>

            <p className="mt-4 text-sm text-slate-400">Projected Source Balance</p>
            <p className="mt-1 text-base font-semibold text-white">
              {fromAccountData
                ? formatCurrency(
                    Math.max(roundCurrency(availableBalance - numericAmount), 0),
                    currency
                  )
                : formatCurrency(0, currency)}
            </p>

            <p className="mt-4 text-sm text-slate-400">Projected Destination Result</p>
            <p className="mt-1 text-base font-semibold text-white">
              {toAccountData && !isCreditPayment
                ? formatCurrency(
                    projectedDestinationBalance,
                    toAccountData.currency ?? "USD"
                  )
                : isCreditPayment
                ? "Applies directly toward the card balance"
                : formatCurrency(0, currency)}
            </p>

            {willOverflowDestination ? (
              <p className="mt-3 text-sm text-rose-400">
                This transfer would push the destination account above the supported
                max balance of {formatCurrency(MAX_ACCOUNT_BALANCE)}.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-center gap-3">
            <Landmark className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Important Note</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Checking and savings accounts can send transfers instantly. Sending money to a credit card is treated as a card payment, while credit cards themselves cannot be used as the source of a transfer.
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Projections are estimates only. Savings withdrawal limits and credit
            card payoff rules can still block a transfer before it posts.
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
