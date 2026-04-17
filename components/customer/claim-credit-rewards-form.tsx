"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Gift, Loader2 } from "lucide-react";

type DestinationAccount = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
};

export function ClaimCreditRewardsForm({
  creditAccountId,
  rewardsBalance,
  destinationAccounts,
}: {
  creditAccountId: string;
  rewardsBalance: number;
  destinationAccounts: DestinationAccount[];
}) {
  const router = useRouter();
  const [selectedDestination, setSelectedDestination] = useState(
    destinationAccounts[0]?.account_id ?? ""
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedAccount = useMemo(
    () =>
      destinationAccounts.find((account) => account.account_id === selectedDestination) ??
      null,
    [destinationAccounts, selectedDestination]
  );

  const hasRewards = rewardsBalance > 0;
  const hasDestination = destinationAccounts.length > 0;

  const handleClaimRewards = () => {
    setMessage("");
    setError("");

    if (!hasRewards) {
      setError("No rewards are available to claim right now.");
      return;
    }

    if (!selectedDestination) {
      setError("Please choose the account that should receive your rewards.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/customer/credit-cards/redeem-rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credit_account_id: creditAccountId,
            destination_account_id: selectedDestination,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Failed to claim rewards.");
          return;
        }

        setMessage(
          `Claimed ${formatCurrency(Number(result.amount || rewardsBalance))} into ${
            selectedAccount?.account_name || "your selected account"
          }.`
        );
        router.refresh();
      } catch {
        setError("Something went wrong while claiming rewards.");
      }
    });
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-amber-400/10 p-3 text-amber-300">
          <Gift size={22} />
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">Claim Rewards</h2>
          <p className="mt-1 text-sm text-slate-400">
            Redeem your available rewards into checking or savings. Rewards are currently treated as cash-back value.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Available rewards</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {formatCurrency(rewardsBalance)}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Claiming rewards moves the full available amount into the selected deposit account.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Send rewards to</label>
            <select
              value={selectedDestination}
              onChange={(event) => {
                setSelectedDestination(event.target.value);
                setError("");
                setMessage("");
              }}
              disabled={!hasDestination || isPending}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {hasDestination ? (
                destinationAccounts.map((account) => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.account_name} - {account.account_type} - ****{account.account_number.slice(-4)}
                  </option>
                ))
              ) : (
                <option value="">No eligible account available</option>
              )}
            </select>
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

          {!hasDestination ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
              Open an active checking or savings account to receive rewards.
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleClaimRewards}
            disabled={!hasRewards || !hasDestination || isPending}
            className="inline-flex items-center justify-center rounded-xl bg-amber-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              "Claim Rewards"
            )}
          </button>
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
