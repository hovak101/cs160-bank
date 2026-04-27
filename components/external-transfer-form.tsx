"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Landmark,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  getAccountTypeLabel,
  isDepositEligible,
  isSavingsAccount,
} from "@/lib/banking/rules";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

type LinkedExternalAccount = {
  linked_account_id: string;
  institution_name: string;
  plaid_account_name: string;
  plaid_account_mask: string;
  plaid_account_subtype: string;
  status: string;
  created_at: string;
};

type PlaidLinkMetadata = {
  institution?: {
    name?: string | null;
  } | null;
  accounts?: Array<{
    id?: string;
  }>;
};

type PlaidHandler = {
  open: () => void;
};

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void;
        onExit?: (error: unknown) => void;
      }) => PlaidHandler;
    };
  }
}

export function ExternalTransferForm({
  accounts,
  isSandboxDemo = false,
}: {
  accounts: Account[];
  isSandboxDemo?: boolean;
}) {
  const router = useRouter();
  const [direction, setDirection] = useState<"inbound" | "outbound">("inbound");
  const [internalAccountId, setInternalAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedExternalAccount[]>([]);
  const [selectedLinkedAccountId, setSelectedLinkedAccountId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPlaidReady, setIsPlaidReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isLinking, setIsLinking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  const eligibleAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          isDepositEligible(account.account_type) &&
          (account.status || "").toLowerCase() === "active"
      ),
    [accounts]
  );

  const selectedAccount = useMemo(
    () => eligibleAccounts.find((account) => account.account_id === internalAccountId),
    [eligibleAccounts, internalAccountId]
  );

  const selectedLinkedAccount = useMemo(
    () =>
      linkedAccounts.find(
        (account) => account.linked_account_id === selectedLinkedAccountId
      ) || null,
    [linkedAccounts, selectedLinkedAccountId]
  );

  const availableBalance = Number(selectedAccount?.balance ?? 0);
  const currency = selectedAccount?.currency ?? "USD";

  useEffect(() => {
    void loadLinkedAccounts();
  }, []);

  const submitLabel =
    direction === "inbound" ? "Pull Into My Account" : "Send To External Bank";

  const loadLinkedAccounts = async () => {
    setIsLoadingAccounts(true);

    try {
      const response = await fetch("/api/customer/plaid/linked-accounts", {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load linked banks.");
        return;
      }

      const nextAccounts = Array.isArray(data.accounts)
        ? (data.accounts as LinkedExternalAccount[])
        : [];

      setLinkedAccounts(nextAccounts);
      setSelectedLinkedAccountId((current) => {
        if (current && nextAccounts.some((account) => account.linked_account_id === current)) {
          return current;
        }
        return nextAccounts[0]?.linked_account_id || "";
      });
    } catch {
      setError("Something went wrong while loading linked banks.");
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleLinkAccount = async () => {
    setError("");
    setMessage("");

    if (!window.Plaid) {
      setError("Plaid Link has not loaded yet. Please try again.");
      return;
    }

    setIsLinking(true);

    try {
      const response = await fetch("/api/customer/plaid/link-token", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.link_token) {
        setError(data.error || "Failed to start Plaid Link.");
        return;
      }

      const handler = window.Plaid.create({
        token: data.link_token,
        onSuccess: (publicToken, metadata) => {
          const selectedPlaidAccount = metadata.accounts?.[0];

          if (!selectedPlaidAccount?.id) {
            setError("Plaid did not return a valid account selection.");
            return;
          }

          void saveLinkedAccount({
            publicToken,
            plaidAccountId: selectedPlaidAccount.id,
            institutionName: metadata.institution?.name || "Plaid linked bank",
          });
        },
        onExit: () => {
          setIsLinking(false);
        },
      });

      handler.open();
    } catch {
      setError("Something went wrong while opening Plaid Link.");
    } finally {
      setIsLinking(false);
    }
  };

  const saveLinkedAccount = async (params: {
    publicToken: string;
    plaidAccountId: string;
    institutionName: string;
  }) => {
    try {
      const response = await fetch("/api/customer/plaid/linked-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_token: params.publicToken,
          plaid_account_id: params.plaidAccountId,
          institution_name: params.institutionName,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.account) {
        setError(data.error || "Failed to save linked bank account.");
        return;
      }

      const savedAccount = data.account as LinkedExternalAccount;

      setLinkedAccounts((current) => {
        const withoutDuplicate = current.filter(
          (account) => account.linked_account_id !== savedAccount.linked_account_id
        );
        return [savedAccount, ...withoutDuplicate];
      });
      setSelectedLinkedAccountId(savedAccount.linked_account_id);
      setMessage(data.message || "External account linked.");
      setError("");
    } catch {
      setError("Something went wrong while saving the linked bank.");
    }
  };

  const handleDeleteLinkedAccount = async () => {
    if (!selectedLinkedAccountId) {
      setError("Choose a linked external account first.");
      return;
    }

    setIsDeleting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/customer/plaid/linked-accounts/${selectedLinkedAccountId}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to remove linked bank.");
        return;
      }

      setLinkedAccounts((current) =>
        current.filter(
          (account) => account.linked_account_id !== selectedLinkedAccountId
        )
      );
      setSelectedLinkedAccountId((current) =>
        current === selectedLinkedAccountId ? "" : current
      );
      setMessage("Linked bank removed.");
    } catch {
      setError("Something went wrong while removing the linked bank.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const numericAmount = Number(amount);

    if (!internalAccountId) {
      setError(
        direction === "inbound"
          ? "Choose the account that should receive the funds."
          : "Choose the account that should send the funds."
      );
      return;
    }

    if (!selectedLinkedAccountId) {
      setError("Choose a saved external bank account first.");
      return;
    }

    if (!amount || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (direction === "outbound" && numericAmount > availableBalance) {
      setError("Insufficient funds. Transfer amount exceeds your balance.");
      return;
    }

    const formData = new FormData();
    formData.append("direction", direction);
    formData.append("internal_account_id", internalAccountId);
    formData.append("amount", amount);
    formData.append("linked_account_id", selectedLinkedAccountId);

    startTransition(async () => {
      try {
        const response = await fetch("/api/customer/external-transfer", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          const shouldReloadBanks =
            typeof data.error === "string" &&
            data.error.toLowerCase().includes("re-link");

          if (shouldReloadBanks) {
            await loadLinkedAccounts();
            setSelectedLinkedAccountId("");
          }

          setError(data.error || "External transfer failed.");
          return;
        }

        setAmount("");
        setMessage(data.message || "External transfer completed.");
        router.refresh();
      } catch {
        setError("Something went wrong while processing the external transfer.");
      }
    });
  };

  if (eligibleAccounts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-[#0f172a] p-8 text-center">
        <h2 className="text-2xl font-bold text-white">
          No eligible deposit accounts
        </h2>
        <p className="mt-2 text-slate-400">
          Open an active checking or savings account before using Plaid external transfers.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"
        strategy="afterInteractive"
        onLoad={() => setIsPlaidReady(true)}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-white/10 bg-[#0f172a] p-6"
        >
          <div>
            <h2 className="text-xl font-bold text-white">External Transfer</h2>
            <p className="mt-1 text-sm text-slate-400">
              Link a bank with Plaid and move money between that account and your checking or savings balance.
            </p>
            {isSandboxDemo ? (
              <p className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm leading-6 text-cyan-100">
                Sandbox demo mode is active. Move Money In is unlimited for easier demos,
                while Move Money Out mirrors the selected Vitality Bank account balance to
                avoid Plaid ledger funding errors.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setDirection("inbound");
                setError("");
                setMessage("");
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                direction === "inbound"
                  ? "border-cyan-400 bg-cyan-400/10 text-white"
                  : "border-white/10 bg-slate-950 text-slate-300 hover:border-cyan-400/40"
              }`}
            >
              <ArrowDownLeft className="mb-3 text-cyan-400" size={18} />
              <p className="font-semibold">Move Money In</p>
              <p className="mt-1 text-sm text-slate-400">
                Pull money from your external bank into Vitality Bank.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setDirection("outbound");
                setError("");
                setMessage("");
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                direction === "outbound"
                  ? "border-cyan-400 bg-cyan-400/10 text-white"
                  : "border-white/10 bg-slate-950 text-slate-300 hover:border-cyan-400/40"
              }`}
            >
              <ArrowUpRight className="mb-3 text-cyan-400" size={18} />
              <p className="font-semibold">Move Money Out</p>
              <p className="mt-1 text-sm text-slate-400">
                Send money from your account to a linked external bank.
              </p>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              {direction === "inbound" ? "Deposit To" : "Send From"}
            </label>
            <select
              value={internalAccountId}
              onChange={(event) => {
                setInternalAccountId(event.target.value);
                setError("");
                setMessage("");
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            >
              <option value="">
                {direction === "inbound"
                  ? "Choose account to receive funds"
                  : "Choose account to send funds"}
              </option>
              {eligibleAccounts.map((account) => (
                <option key={account.account_id} value={account.account_id}>
                  {account.account_name} - {getAccountTypeLabel(account.account_type)} -
                  {" "}****{account.account_number?.slice(-4)}
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
              onChange={(event) => {
                setAmount(event.target.value);
                setError("");
                setMessage("");
              }}
              placeholder="Enter transfer amount"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-400">Linked Bank</p>
                <p className="mt-1 text-base font-semibold text-white">
                  {selectedLinkedAccount
                    ? `${selectedLinkedAccount.institution_name} - ${selectedLinkedAccount.plaid_account_name}${
                        selectedLinkedAccount.plaid_account_mask
                          ? ` ****${selectedLinkedAccount.plaid_account_mask}`
                          : ""
                      }`
                    : isLoadingAccounts
                    ? "Loading linked banks..."
                    : "No saved bank linked yet"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadLinkedAccounts()}
                  disabled={isLoadingAccounts}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-semibold text-white hover:border-cyan-400/40 disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={isLoadingAccounts ? "animate-spin" : ""}
                  />
                </button>
                <button
                  type="button"
                  onClick={handleLinkAccount}
                  disabled={isLinking || !isPlaidReady}
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                >
                  {isLinking ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <Link2 size={16} className="mr-2" />
                      Link Bank
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="text-sm font-medium text-slate-300">
                Saved external accounts
              </label>
              <select
                value={selectedLinkedAccountId}
                onChange={(event) => {
                  setSelectedLinkedAccountId(event.target.value);
                  setError("");
                  setMessage("");
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="">
                  {isLoadingAccounts
                    ? "Loading linked banks"
                    : linkedAccounts.length > 0
                    ? "Choose a saved linked bank"
                    : "No linked bank saved yet"}
                </option>
                {linkedAccounts.map((account) => (
                  <option
                    key={account.linked_account_id}
                    value={account.linked_account_id}
                  >
                    {account.institution_name} - {account.plaid_account_name}
                    {account.plaid_account_mask
                      ? ` ****${account.plaid_account_mask}`
                      : ""}
                  </option>
                ))}
              </select>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleDeleteLinkedAccount}
                  disabled={isDeleting || !selectedLinkedAccountId}
                  className="inline-flex items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/15 disabled:opacity-60"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className="mr-2" />
                      Remove Linked Bank
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {selectedAccount ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-sm font-medium text-slate-400">
                {direction === "inbound" ? "Receiving Account" : "Source Account"}
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {formatCurrency(availableBalance, currency)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedAccount.account_name} - ****
                {selectedAccount.account_number?.slice(-4)}
              </p>
              {direction === "outbound" && isSavingsAccount(selectedAccount.account_type) ? (
                <p className="mt-2 text-xs text-amber-300">
                  Savings external transfers count toward your monthly 10% withdrawal allowance.
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
            ) : (
              submitLabel
            )}
          </button>
        </form>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
            <div className="flex items-center gap-3">
              <Landmark className="text-cyan-400" />
              <h3 className="text-lg font-bold text-white">How It Works</h3>
            </div>
            <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-400">
              <p>1. Link an external checking or savings account through Plaid Link.</p>
              <p>2. The bank is saved for later use so you do not need to relink every transfer.</p>
              <p>3. Choose direction, select accounts, and confirm the amount.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
            <div className="flex items-center gap-3">
              <Landmark className="text-cyan-400" />
              <h3 className="text-lg font-bold text-white">Demo Notes</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This version stores linked Plaid accounts in the database for repeat demo transfers. Access tokens are encrypted before they are written to storage.
            </p>
            {isSandboxDemo ? (
              <p className="mt-3 text-sm leading-6 text-slate-400">
                In sandbox, inbound transfers are unlimited for demos, while outbound
                transfers mirror the selected internal account balance.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}
