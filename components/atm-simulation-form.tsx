"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import {
  buildAtmInstruction,
  canUseAtmDeposit,
  canUseAtmWithdrawal,
  type AtmAction,
  type AtmLocationSelection,
} from "@/lib/atm/demo";
import {
  computeCreditCashAdvanceFee,
  getAccountTypeLabel,
  isCreditAccount,
  isSavingsAccount,
} from "@/lib/banking/rules";
import {
  isValidSecurityCodeFormat,
  normalizeSecurityCode,
} from "@/lib/banking/security-code";
import {
  LARGE_DEPOSIT_SUPPORT_MESSAGE,
  MANUAL_DEPOSIT_LIMIT_USD,
  parseCurrencyInput,
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

type PendingAtmSimulation = {
  atm_simulation_id: string;
  transaction_id: string;
  account_id: string;
  atm_id: string;
  atm_name: string;
  atm_location: string;
  action: AtmAction;
  amount: number;
  verification_code: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  account_name?: string;
  account_type?: string;
  account_mask?: string;
  currency?: string;
  instruction?: string;
  fee_amount?: number;
};

type AtmApiResult = {
  atm_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: string;
};

function normalizeAction(value: string | undefined): AtmAction {
  return value === "deposit" ? "deposit" : "withdraw";
}

function mapAtmApiResult(result: AtmApiResult): AtmLocationSelection {
  return {
    atm_id: result.atm_id,
    name: result.name,
    location: result.address,
    distance: result.distance,
    lat: Number(result.lat || 0),
    lng: Number(result.lng || 0),
    source: "search",
  };
}

function getDirectionsUrl(atm: Pick<AtmLocationSelection, "lat" | "lng">) {
  return `https://www.google.com/maps/dir/?api=1&destination=${atm.lat},${atm.lng}`;
}

export function AtmSimulationForm({
  accounts,
  initialAction = "withdraw",
  initialPendingSimulations = [],
}: {
  accounts: Account[];
  initialAction?: string;
  initialPendingSimulations?: PendingAtmSimulation[];
}) {
  const router = useRouter();
  const [action, setAction] = useState<AtmAction>(normalizeAction(initialAction));
  const [selectedAtmId, setSelectedAtmId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingSimulations, setPendingSimulations] = useState<PendingAtmSimulation[]>(
    initialPendingSimulations
  );
  const [activePendingId, setActivePendingId] = useState(
    initialPendingSimulations[0]?.atm_simulation_id || ""
  );
  const [atmResults, setAtmResults] = useState<AtmLocationSelection[]>([]);
  const [atmSearchQuery, setAtmSearchQuery] = useState("");
  const [atmLookupError, setAtmLookupError] = useState("");
  const [atmLookupMessage, setAtmLookupMessage] = useState("");
  const [isSearchingAtms, setIsSearchingAtms] = useState(false);
  const [hasAttemptedNearbySearch, setHasAttemptedNearbySearch] = useState(false);
  const [isSubmitting, startSubmitting] = useTransition();
  const [isFinishing, startFinishing] = useTransition();
  const [isCancelling, startCancelling] = useTransition();

  useEffect(() => {
    setAction(normalizeAction(initialAction));
  }, [initialAction]);

  const actionAccounts = useMemo(
    () =>
      accounts.filter((account) =>
        (account.status || "").toLowerCase() === "active" &&
        (action === "withdraw"
          ? canUseAtmWithdrawal(account.account_type)
          : canUseAtmDeposit(account.account_type))
      ),
    [accounts, action]
  );

  useEffect(() => {
    if (
      selectedAccountId &&
      actionAccounts.some((account) => account.account_id === selectedAccountId)
    ) {
      return;
    }

    setSelectedAccountId(actionAccounts[0]?.account_id || "");
  }, [actionAccounts, selectedAccountId]);

  const selectedAccount = useMemo(
    () => actionAccounts.find((account) => account.account_id === selectedAccountId) || null,
    [actionAccounts, selectedAccountId]
  );

  const selectedAtm = useMemo(
    () => atmResults.find((atm) => atm.atm_id === selectedAtmId) || null,
    [atmResults, selectedAtmId]
  );

  const activePendingSimulation = useMemo(
    () =>
      pendingSimulations.find(
        (simulation) => simulation.atm_simulation_id === activePendingId
      ) || pendingSimulations[0] || null,
    [activePendingId, pendingSimulations]
  );

  const showSecurityCode =
    action === "withdraw" && !!selectedAccount && isCreditAccount(selectedAccount.account_type);

  const feePreview = showSecurityCode
    ? computeCreditCashAdvanceFee(Number(amount || 0))
    : 0;

  const availableBalance = Number(selectedAccount?.balance || 0);
  const currency = selectedAccount?.currency || "USD";

  const updateAtmResults = (results: AtmLocationSelection[], emptyMessage?: string) => {
    setAtmResults(results);
    setAtmLookupMessage(results.length === 0 ? emptyMessage || "" : "");
    setSelectedAtmId((current) => {
      if (current && results.some((atm) => atm.atm_id === current)) {
        return current;
      }

      return results[0]?.atm_id || "";
    });
  };

  const fetchAtmResults = async (url: string, emptyMessage: string) => {
    setAtmLookupError("");
    setAtmLookupMessage("");
    setIsSearchingAtms(true);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not find nearby Chase ATMs.");
      }

      updateAtmResults(
        Array.isArray(data.results) ? data.results.map(mapAtmApiResult) : [],
        emptyMessage
      );
    } catch (lookupError) {
      setAtmLookupError(
        lookupError instanceof Error
          ? lookupError.message
          : "Could not find nearby Chase ATMs."
      );
    } finally {
      setIsSearchingAtms(false);
    }
  };

  const handleSearchAtms = async () => {
    if (!atmSearchQuery.trim()) {
      setAtmLookupError("Enter an address, city, or zip code first.");
      return;
    }

    await fetchAtmResults(
      `/api/find-atm?query=${encodeURIComponent(atmSearchQuery.trim())}`,
      "No ATMs were found for that search."
    );
  };

  const handleUseCurrentLocation = async () => {
    setAtmLookupError("");
    setAtmLookupMessage("");

    if (!navigator.geolocation) {
      setAtmLookupError(
        "This browser cannot access your current location. Search by address instead."
      );
      return;
    }

    setIsSearchingAtms(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void fetchAtmResults(
          `/api/find-atm?lat=${position.coords.latitude}&lng=${position.coords.longitude}`,
          "No nearby Chase ATMs were found around your current location."
        );
      },
      () => {
        setIsSearchingAtms(false);
        setAtmLookupError(
          "We could not access your current location. Search by address instead."
        );
      },
      { timeout: 5000 }
    );
  };

  useEffect(() => {
    if (hasAttemptedNearbySearch) {
      return;
    }

    setHasAttemptedNearbySearch(true);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAtmLookupMessage("Search by address, city, or zip code to choose a Chase ATM.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          setAtmLookupError("");
          setAtmLookupMessage("");
          setIsSearchingAtms(true);

          try {
            const response = await fetch(
              `/api/find-atm?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
            );
            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "Could not find nearby Chase ATMs.");
            }

            const results: AtmLocationSelection[] = Array.isArray(data.results)
              ? data.results.map(mapAtmApiResult)
              : [];

            setAtmResults(results);
            setAtmLookupMessage(
              results.length === 0
                ? "No nearby Chase ATMs were found around your current location."
                : ""
            );
            setSelectedAtmId((current) => {
              if (current && results.some((atm) => atm.atm_id === current)) {
                return current;
              }

              return results[0]?.atm_id || "";
            });
          } catch {
            setAtmLookupMessage("Search by address, city, or zip code to choose a Chase ATM.");
          } finally {
            setIsSearchingAtms(false);
          }
        })();
      },
      () => {
        setAtmLookupMessage("Search by address, city, or zip code to choose a Chase ATM.");
      },
      { timeout: 5000 }
    );
  }, [hasAttemptedNearbySearch]);

  const handleStartSimulation = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsedAmount = parseCurrencyInput(amount, {
      fieldLabel: "Amount",
      max: action === "deposit" ? MANUAL_DEPOSIT_LIMIT_USD : undefined,
      maxErrorMessage:
        action === "deposit" ? LARGE_DEPOSIT_SUPPORT_MESSAGE : undefined,
    });

    if (!selectedAtm) {
      setError("Please choose an ATM location.");
      return;
    }

    if (!selectedAccountId) {
      setError("Please choose one of your accounts.");
      return;
    }

    if (!parsedAmount.ok) {
      setError(parsedAmount.error);
      return;
    }

    const numericAmount = parsedAmount.value;

    if (showSecurityCode && !isValidSecurityCodeFormat(securityCode)) {
      setError("Please enter the 3-digit security code for this credit card.");
      return;
    }

    startSubmitting(async () => {
      try {
        const response = await fetch("/api/customer/atm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            atm_id: selectedAtm.atm_id,
            atm_name: selectedAtm.name,
            atm_location: selectedAtm.location,
            account_id: selectedAccountId,
            action,
            amount: numericAmount,
            security_code: showSecurityCode ? securityCode : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to start the ATM simulation.");
          return;
        }

        const simulation = data.simulation as PendingAtmSimulation;
        setPendingSimulations((current) => [simulation, ...current]);
        setActivePendingId(simulation.atm_simulation_id);
        setAmount("");
        setSecurityCode("");
        setMessage(data.message || "ATM action is ready.");
      } catch {
        setError("Something went wrong while starting the ATM simulation.");
      }
    });
  };

  const handleFinishSimulation = (simulationId: string) => {
    setError("");
    setMessage("");

    startFinishing(async () => {
      try {
        const response = await fetch(`/api/customer/atm/${simulationId}/complete`, {
          method: "POST",
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to finish the ATM transaction.");
          return;
        }

        setPendingSimulations((current) =>
          current.filter((simulation) => simulation.atm_simulation_id !== simulationId)
        );
        setActivePendingId("");
        setMessage(data.message || "ATM transaction completed successfully.");
        router.refresh();
      } catch {
        setError("Something went wrong while completing the ATM transaction.");
      }
    });
  };

  const handleCancelSimulation = (simulationId: string) => {
    setError("");
    setMessage("");

    startCancelling(async () => {
      try {
        const response = await fetch(`/api/customer/atm/${simulationId}/cancel`, {
          method: "POST",
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to cancel the ATM transaction.");
          return;
        }

        setPendingSimulations((current) => {
          const next = current.filter(
            (simulation) => simulation.atm_simulation_id !== simulationId
          );
          setActivePendingId(next[0]?.atm_simulation_id || "");
          return next;
        });
        setMessage(data.message || "ATM action cancelled.");
        router.refresh();
      } catch {
        setError("Something went wrong while cancelling the ATM transaction.");
      }
    });
  };

  if (actionAccounts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-[#0f172a] p-8 text-center">
        <h2 className="text-2xl font-bold text-white">No eligible ATM accounts</h2>
        <p className="mt-2 text-slate-400">
          Open a checking, savings, or credit product before using the ATM demo.
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
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={handleStartSimulation}
        className="space-y-6 rounded-3xl border border-white/10 bg-[#0f172a] p-6"
      >
        <div>
          <h2 className="text-xl font-bold text-white">ATM Simulation</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search for a real Chase ATM location, start a pending ATM withdrawal or
            deposit, then click <span className="font-semibold text-white">I finished</span>{" "}
            once the demo ATM action is done.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setAction("withdraw");
              setError("");
              setMessage("");
            }}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              action === "withdraw"
                ? "border-cyan-400 bg-cyan-400/10 text-white"
                : "border-white/10 bg-slate-950 text-slate-300 hover:border-cyan-400/40"
            }`}
          >
            <ArrowUpRight className="mb-3 text-cyan-400" size={18} />
            <p className="font-semibold">Withdraw at this ATM</p>
            <p className="mt-1 text-sm text-slate-400">
              Generate a verification code, take cash, then finish the demo.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setAction("deposit");
              setError("");
              setMessage("");
            }}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              action === "deposit"
                ? "border-cyan-400 bg-cyan-400/10 text-white"
                : "border-white/10 bg-slate-950 text-slate-300 hover:border-cyan-400/40"
            }`}
          >
            <ArrowDownLeft className="mb-3 text-cyan-400" size={18} />
            <p className="font-semibold">Deposit at this ATM</p>
            <p className="mt-1 text-sm text-slate-400">
              Create a pending ATM deposit, then confirm once the ATM accepts it.
            </p>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300">Find a Chase ATM</label>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Search by address, city, or zip code, or use your current location to
              pick a real nearby Chase ATM.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              maxLength={200}
              value={atmSearchQuery}
              onChange={(event) => {
                setAtmSearchQuery(event.target.value.slice(0, 200));
                setAtmLookupError("");
                setAtmLookupMessage("");
              }}
              onKeyDown={(event) => event.key === "Enter" && void handleSearchAtms()}
              placeholder="Enter address, city, or zip code"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400 sm:flex-1"
            />
            <button
              type="button"
              onClick={() => void handleSearchAtms()}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 font-semibold text-white transition hover:border-cyan-400/40"
            >
              Search Chase ATMs
            </button>
            <button
              type="button"
              onClick={() => void handleUseCurrentLocation()}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              <LocateFixed size={16} className="mr-2" />
              Use My Location
            </button>
          </div>

          {isSearchingAtms ? (
            <p className="text-sm text-slate-400">Searching for nearby Chase ATMs...</p>
          ) : null}

          {atmLookupError ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
              <AlertCircle size={18} className="mt-0.5" />
              <p className="text-sm">{atmLookupError}</p>
            </div>
          ) : null}

          {!atmLookupError && atmLookupMessage ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-400">
              {atmLookupMessage}
            </div>
          ) : null}

          {atmResults.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {atmResults.map((atm) => {
                const isSelected = selectedAtmId === atm.atm_id;

                return (
                  <button
                    key={atm.atm_id}
                    type="button"
                    onClick={() => {
                      setSelectedAtmId(atm.atm_id);
                      setError("");
                      setMessage("");
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-white/10 bg-slate-950 hover:border-cyan-400/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 text-cyan-400" size={18} />
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{atm.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{atm.location}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {atm.distance ? <span>{atm.distance} away</span> : null}
                          {atm.hours ? <span>{atm.hours}</span> : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Select Account
          </label>
          <select
            value={selectedAccountId}
            onChange={(event) => {
              setSelectedAccountId(event.target.value);
              setSecurityCode("");
              setError("");
              setMessage("");
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          >
            <option value="">Choose an account</option>
            {actionAccounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name} - {getAccountTypeLabel(account.account_type)} - ****
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
            onChange={(event) => {
              setAmount(event.target.value);
              setError("");
              setMessage("");
            }}
            placeholder={
              action === "withdraw"
                ? "Enter ATM withdrawal amount"
                : "Enter ATM deposit amount"
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
          />
        </div>

        {showSecurityCode ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Security Code</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              value={securityCode}
              onChange={(event) => {
                setSecurityCode(normalizeSecurityCode(event.target.value));
                setError("");
                setMessage("");
              }}
              placeholder="3-digit code"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
            />
            <p className="text-xs leading-5 text-slate-500">
              Credit card ATM withdrawals are treated as demo cash advances and
              still require the card security code.
            </p>
          </div>
        ) : null}

        {selectedAccount ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm font-medium text-slate-400">Selected Account</p>
            <p className="mt-1 text-xl font-bold text-white">
              {selectedAccount.account_name} - ****{selectedAccount.account_number.slice(-4)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-cyan-400">
              {getAccountTypeLabel(selectedAccount.account_type)}
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Status:{" "}
              <span className="font-semibold capitalize text-white">
                {selectedAccount.status}
              </span>
            </p>

            {!isCreditAccount(selectedAccount.account_type) ? (
              <>
                <p className="mt-3 text-sm text-slate-400">Current Balance</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {formatCurrency(availableBalance, currency)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-slate-400">Cash Advance Fee Preview</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {formatCurrency(feePreview, currency)}
                </p>
              </>
            )}

            {action === "withdraw" && isSavingsAccount(selectedAccount.account_type) ? (
              <p className="mt-3 text-xs text-amber-300">
                Savings ATM withdrawals still use the monthly 10% withdrawal cap.
              </p>
            ) : null}

            {showSecurityCode ? (
              <p className="mt-3 text-xs text-amber-300">
                Completing this ATM withdrawal will add the cash advance amount and fee
                to your card balance.
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
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              Starting...
            </>
          ) : action === "withdraw" ? (
            "Generate ATM Code"
          ) : (
            "Start ATM Deposit"
          )}
        </button>
      </form>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-center gap-3">
            <Landmark className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white">How This Demo Works</h3>
          </div>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
            <li>1. Find a nearby Chase ATM by address or current location.</li>
            <li>2. Choose an account, action, and amount.</li>
            <li>3. Start a pending ATM transaction in the app.</li>
            <li>4. Click <span className="font-semibold text-white">I finished</span> after the ATM action is done.</li>
          </ol>
        </div>

        {activePendingSimulation ? (
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-cyan-300" />
              <h3 className="text-lg font-bold text-white">Pending ATM Action</h3>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f172a] p-5">
              <p className="text-sm text-slate-400">Action</p>
              <p className="mt-1 text-base font-semibold text-white">
                {activePendingSimulation.action === "withdraw"
                  ? "ATM Withdrawal"
                  : "ATM Deposit"}
              </p>

              <p className="mt-4 text-sm text-slate-400">ATM</p>
              <p className="mt-1 text-base font-semibold text-white">
                {activePendingSimulation.atm_name}
              </p>
              <p className="text-sm text-slate-400">
                {activePendingSimulation.atm_location}
              </p>

              <p className="mt-4 text-sm text-slate-400">Account</p>
              <p className="mt-1 text-base font-semibold text-white">
                {activePendingSimulation.account_name
                  ? `${activePendingSimulation.account_name} - ****${activePendingSimulation.account_mask || ""}`
                  : "Selected account"}
              </p>

              <p className="mt-4 text-sm text-slate-400">Amount</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {formatCurrency(
                  Number(activePendingSimulation.amount || 0),
                  activePendingSimulation.currency || "USD"
                )}
              </p>

              {activePendingSimulation.verification_code ? (
                <>
                  <p className="mt-4 text-sm text-slate-400">Verification Code</p>
                  <p className="mt-1 text-2xl font-bold tracking-[0.2em] text-cyan-300">
                    {activePendingSimulation.verification_code}
                  </p>
                </>
              ) : null}

              <p className="mt-4 text-sm leading-6 text-slate-300">
                {activePendingSimulation.instruction ||
                  buildAtmInstruction(activePendingSimulation.action, {
                    name: activePendingSimulation.atm_name,
                  })}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isFinishing || isCancelling}
                  onClick={() =>
                    handleFinishSimulation(activePendingSimulation.atm_simulation_id)
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                >
                  {isFinishing ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    "I finished"
                  )}
                </button>

                <button
                  type="button"
                  disabled={isFinishing || isCancelling}
                  onClick={() =>
                    handleCancelSimulation(activePendingSimulation.atm_simulation_id)
                  }
                  className="inline-flex items-center justify-center rounded-xl border border-red-500/30 px-5 py-3 font-semibold text-red-300 hover:border-red-400/50 hover:bg-red-500/10 disabled:opacity-60"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel"
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
            <div className="flex items-center gap-3">
              <MapPin className="text-cyan-400" />
              <h3 className="text-lg font-bold text-white">Selected ATM</h3>
            </div>
            {selectedAtm ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <p className="text-base font-semibold text-white">{selectedAtm.name}</p>
                <p className="mt-1 text-sm text-slate-400">{selectedAtm.location}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {selectedAtm.distance ? <span>{selectedAtm.distance} away</span> : null}
                  {selectedAtm.hours ? <span>{selectedAtm.hours}</span> : null}
                </div>
                {typeof selectedAtm.lat === "number" && typeof selectedAtm.lng === "number" ? (
                  <a
                    href={getDirectionsUrl(selectedAtm)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                  >
                    <Navigation size={16} className="mr-2" />
                    Open Directions
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                Search by address or current location to choose a Chase ATM before
                starting the transaction.
              </div>
            )}
          </div>
        )}

        {pendingSimulations.length > 1 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="text-cyan-400" />
              <h3 className="text-lg font-bold text-white">Other Pending ATM Actions</h3>
            </div>

            <div className="mt-4 space-y-3">
              {pendingSimulations
                .filter(
                  (simulation) =>
                    simulation.atm_simulation_id !== activePendingSimulation?.atm_simulation_id
                )
                .map((simulation) => (
                  <button
                    key={simulation.atm_simulation_id}
                    type="button"
                    onClick={() => setActivePendingId(simulation.atm_simulation_id)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-left transition hover:border-cyan-400/40"
                  >
                    <p className="font-semibold text-white">
                      {simulation.action === "withdraw"
                        ? "ATM Withdrawal"
                        : "ATM Deposit"}{" "}
                      - {simulation.atm_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatCurrency(Number(simulation.amount || 0))} -{" "}
                      {new Date(simulation.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </button>
                ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
          <div className="flex gap-3">
            <Link
              href="/customer/dashboard"
              className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-400/40"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/customer/transactions"
              className="inline-flex rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              View Transactions
            </Link>
          </div>
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
