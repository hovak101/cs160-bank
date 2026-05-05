"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

type Recipient = {
  customer_id: string;
  receiver_name: string;
  phone_number: string;
};

type FundingSource =
  | {
      value: string;
      type: "account";
      label: string;
      balance: number;
      currency: string;
      accountId: string;
    }
  | {
      value: string;
      type: "cashbox";
      label: string;
      balance: number;
      currency: string;
      accountId: null;
    };

export default function CashboxSendForm({
  accounts,
  cashboxBalance,
  embedded = false,
  continueHref = "/customer/cashbox",
}: {
  accounts: Account[];
  cashboxBalance: number;
  embedded?: boolean;
  continueHref?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [rawPhone, setRawPhone] = useState("");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const fundingSources: FundingSource[] = useMemo(() => {
    const accountSources: FundingSource[] = accounts.map((account) => ({
      value: `account:${account.account_id}`,
      type: "account",
      label: `${(
        account.account_name || account.account_type
      ).toUpperCase()} • ****${account.account_number.slice(-4)} • ${formatCurrency(
        account.balance,
        account.currency
      )}`,
      balance: Number(account.balance ?? 0),
      currency: account.currency ?? "USD",
      accountId: account.account_id,
    }));

    const cashboxSource: FundingSource = {
      value: "cashbox:cashbox",
      type: "cashbox",
      label: `CASHBOX • ${formatCurrency(cashboxBalance)}`,
      balance: cashboxBalance,
      currency: "USD",
      accountId: null,
    };

    return [...accountSources, cashboxSource];
  }, [accounts, cashboxBalance]);

  const [sourceValue, setSourceValue] = useState(
    fundingSources[0]?.value ?? "cashbox:cashbox"
  );
  const [amount, setAmount] = useState("");

  const [confirmationChecked, setConfirmationChecked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const selectedSource = useMemo(
    () => fundingSources.find((source) => source.value === sourceValue),
    [fundingSources, sourceValue]
  );

  const parsedAmount = parseCurrencyInput(amount, {
    fieldLabel: "CashBox send amount",
  });
  const numericAmount = parsedAmount.ok ? parsedAmount.value : 0;
  const insufficientBalance = selectedSource
    ? parsedAmount.ok && numericAmount > Number(selectedSource.balance ?? 0)
    : false;

  function formatPhoneNumber(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 10);

    if (digits.length === 0) return "";
    if (digits.length < 4) return `(${digits}`;
    if (digits.length < 7) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
      6,
      10
    )}`;
  }

  async function lookupRecipientByPhone(digits: string) {
    setError("");
    setRecipient(null);

    if (!digits.trim()) {
      setError("Please enter a phone number first.");
      return;
    }

    if (digits.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      setLookupLoading(true);

      const response = await fetch("/api/customer/cashbox/lookup-recipient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: digits,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to find recipient.");
        return;
      }

      setRecipient(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLookupLoading(false);
    }
  }

  useEffect(() => {
    const phoneFromQuery = searchParams.get("phone");
    if (!phoneFromQuery) return;

    const digits = phoneFromQuery.replace(/\D/g, "").slice(0, 10);
    if (digits.length !== 10) return;

    setRawPhone(digits);
    setPhoneNumber(formatPhoneNumber(digits));

    void lookupRecipientByPhone(digits);
  }, [searchParams]);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value;
    const digits = input.replace(/\D/g, "").slice(0, 10);

    setRawPhone(digits);
    setPhoneNumber(formatPhoneNumber(digits));
    setRecipient(null);
    setError("");
  }

  async function handleLookupRecipient() {
    await lookupRecipientByPhone(rawPhone);
  }

  function handleConfirmRecipient() {
    if (!recipient) {
      setError("Please find a valid recipient first.");
      return;
    }

    setError("");
    setStep(2);
  }

  function handleContinueToReview() {
    setError("");

    if (!recipient) {
      setError("Please confirm the recipient first.");
      setStep(1);
      return;
    }

    if (!selectedSource) {
      setError("Please choose a funding source.");
      return;
    }

    if (!parsedAmount.ok) {
      setError(parsedAmount.error);
      return;
    }

    if (insufficientBalance) {
      setError(
        selectedSource.type === "cashbox"
          ? "Insufficient CashBox balance."
          : "Insufficient balance in the selected account."
      );
      return;
    }

    setStep(3);
  }

  async function handleSubmitFinal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!recipient) {
      setError("Recipient is missing.");
      setStep(1);
      return;
    }

    if (!confirmationChecked) {
      setError("Please confirm the transfer details before sending.");
      return;
    }

    if (!selectedSource) {
      setError("Please choose a funding source.");
      setStep(2);
      return;
    }

    if (!parsedAmount.ok) {
      setError(parsedAmount.error);
      setStep(2);
      return;
    }

    if (insufficientBalance) {
      setError(
        selectedSource.type === "cashbox"
          ? "Insufficient CashBox balance."
          : "Insufficient balance in the selected account."
      );
      setStep(2);
      return;
    }

    try {
      setLoading(true);

      const endpoint =
        selectedSource.type === "cashbox"
          ? "/api/customer/cashbox/send-from-cashbox"
          : "/api/customer/cashbox/send";

      const payload =
        selectedSource.type === "cashbox"
          ? {
              phone_number: rawPhone,
              amount: numericAmount,
            }
          : {
              phone_number: rawPhone,
              source_account_id: selectedSource.accountId,
              amount: numericAmount,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to send money.");
        return;
      }

      const sourceLabel =
        selectedSource.type === "cashbox"
          ? "CashBox"
          : selectedSource.label.split(" • ")[0];

      setSuccessMessage(
        `Sent ${formatCurrency(
          numericAmount,
          selectedSource.currency ?? "USD"
        )} successfully to ${recipient.receiver_name} from ${sourceLabel}${
          result.reference_number ? ` (${result.reference_number})` : ""
        }.`
      );

      setShowSuccessModal(true);

      setStep(1);
      setPhoneNumber("");
      setRawPhone("");
      setRecipient(null);
      setAmount("");
      setConfirmationChecked(false);
      setSourceValue(fundingSources[0]?.value ?? "cashbox:cashbox");
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
            <h1 className="text-3xl font-bold text-white">Send to CashBox</h1>
            <p className="mt-2 text-slate-400">
              Send money to another user using their phone number with extra
              confirmation steps.
            </p>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <StepBadge
            active={step === 1}
            done={step > 1}
            label="1. Verify Recipient"
          />
          <StepBadge
            active={step === 2}
            done={step > 2}
            label="2. Enter Amount"
          />
          <StepBadge
            active={step === 3}
            done={false}
            label="3. Review & Confirm"
          />
        </div>

        <Card className="border-white/10 bg-[#0f172a] p-6">
          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Receiver Phone Number
                </label>
                <input
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="(123) 456-7890"
                  inputMode="numeric"
                  maxLength={14}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
                <p className="mt-2 text-sm text-slate-400">
                  Enter a 10-digit phone number.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleLookupRecipient}
                  disabled={lookupLoading}
                  className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {lookupLoading ? "Searching..." : "Find Recipient"}
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

              {recipient ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                  <p className="text-sm text-emerald-300">Recipient found</p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {recipient.receiver_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Phone: {formatPhoneNumber(recipient.phone_number || "")}
                  </p>

                  <button
                    type="button"
                    onClick={handleConfirmRecipient}
                    className="mt-4 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Confirm Recipient
                  </button>
                </div>
              ) : null}

              {renderMessage(error, "error")}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">Sending to</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {recipient?.receiver_name}
                </p>
                <p className="text-sm text-slate-400">
                  {formatPhoneNumber(recipient?.phone_number || "")}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Send From
                </label>
                <select
                  value={sourceValue}
                  onChange={(e) => setSourceValue(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                >
                  {fundingSources.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
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

                {selectedSource ? (
                  <p className="mt-2 text-sm text-slate-400">
                    {selectedSource.type === "cashbox"
                      ? "Available CashBox balance: "
                      : "Available account balance: "}
                    {formatCurrency(
                      selectedSource.balance,
                      selectedSource.currency
                    )}
                  </p>
                ) : null}

                {insufficientBalance ? (
                  <p className="mt-2 text-sm text-rose-400">
                    {selectedSource?.type === "cashbox"
                      ? "Your CashBox does not have enough balance."
                      : "The selected account does not have enough balance."}
                  </p>
                ) : null}
              </div>

              {renderMessage(error, "error")}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:text-cyan-300"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleContinueToReview}
                  className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <form onSubmit={handleSubmitFinal} className="space-y-5">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
                <p className="text-sm font-medium text-amber-300">
                  Final confirmation
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  Please review carefully before sending money.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SummaryItem
                  label="Recipient"
                  value={recipient?.receiver_name || "-"}
                />
                <SummaryItem
                  label="Phone Number"
                  value={formatPhoneNumber(recipient?.phone_number || "") || "-"}
                />
                <SummaryItem
                  label="Send From"
                  value={
                    selectedSource?.type === "cashbox"
                      ? "CashBox"
                      : selectedSource
                      ? selectedSource.label.split(" • $")[0]
                      : "-"
                  }
                />
                <SummaryItem
                  label="Amount"
                  value={formatCurrency(
                    numericAmount,
                    selectedSource?.currency ?? "USD"
                  )}
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <input
                  type="checkbox"
                  checked={confirmationChecked}
                  onChange={(e) => setConfirmationChecked(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-slate-300">
                  I confirm that the recipient phone number, recipient name, and
                  transfer amount are correct.
                </span>
              </label>

              {renderMessage(error, "error")}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep(2);
                  }}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:text-cyan-300"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading || !confirmationChecked}
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send Money"}
                </button>
              </div>
            </form>
          ) : null}
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

function StepBadge({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        active
          ? "bg-cyan-500 text-slate-950"
          : done
          ? "bg-emerald-500/20 text-emerald-300"
          : "bg-slate-800 text-slate-400"
      }`}
    >
      {label}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function renderMessage(message: string, type: "error" | "success") {
  if (!message) return null;

  if (type === "error") {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
        {message}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
      {message}
    </div>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}
