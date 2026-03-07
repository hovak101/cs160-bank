"use client";

import { Landmark, Wallet, CircleDollarSign } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Account = {
  account_id: string;
  account_number: string;
  balance: number;
  status: string;
};

export function BankDepositPanel() {
  const supabase = createClient();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [tab, setTab] = useState<"atm" | "check">("atm");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      setFetching(true);
      setMsg(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMsg("You must be logged in.");
        setFetching(false);
        return;
      }

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (customerError || !customer) {
        setMsg("Customer profile not found.");
        setFetching(false);
        return;
      }

      const { data, error } = await supabase
        .from("accounts")
        .select("account_id, account_number, balance, status")
        .eq("customer_id", customer.customer_id)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (error) {
        setMsg(error.message);
      } else {
        const rows = data || [];
        setAccounts(rows);
        if (rows.length > 0) setAccountId(rows[0].account_id);
      }

      setFetching(false);
    }

    loadAccounts();
  }, [supabase]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.account_id === accountId),
    [accounts, accountId]
  );

  async function handleDeposit() {
    setMsg(null);

    if (!accountId) {
      setMsg("Please select an account.");
      return;
    }

    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      setMsg("Please enter a valid amount.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/atm/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          amount: parsedAmount,
          description: "ATM cash deposit",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json.error || "Deposit failed.");
      } else {
        setMsg("Deposit recorded successfully.");
        setAmount("");
      }
    } catch {
      setMsg("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[44px] leading-none font-bold tracking-tight text-slate-900">
          Deposit Money
        </h1>
        <p className="mt-3 text-[18px] text-slate-500">Add funds to your account</p>
      </div>

      <div className="w-full rounded-[22px] bg-slate-100 p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setTab("atm")}
            className={`rounded-[18px] px-6 py-3 text-[18px] font-semibold transition ${
              tab === "atm"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-700 hover:bg-white/70"
            }`}
          >
            ATM Deposit
          </button>
          <button
            type="button"
            onClick={() => setTab("check")}
            className={`rounded-[18px] px-6 py-3 text-[18px] font-semibold transition ${
              tab === "check"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-700 hover:bg-white/70"
            }`}
          >
            Check Deposit
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
        {tab === "atm" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-[22px] font-bold text-slate-900">ATM Deposit</h2>
              <p className="mt-1 text-[18px] text-slate-500">
                Record a deposit made at an ATM
              </p>
            </div>

            {fetching ? (
              <p className="text-slate-500">Loading accounts...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[18px] font-semibold text-slate-900">
                    Deposit To Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[18px] text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option value="">Select account</option>
                    {accounts.map((acc) => (
                      <option key={acc.account_id} value={acc.account_id}>
                        ****{acc.account_number?.slice(-4)} — $
                        {Number(acc.balance).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[18px] font-semibold text-slate-900">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[18px] text-slate-700 outline-none focus:border-blue-400"
                  />
                </div>

                <div className="rounded-[22px] border border-blue-100 bg-blue-50 px-5 py-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-blue-600">
                      <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-bold text-blue-800">
                        How to deposit at an ATM:
                      </h3>
                      <ol className="mt-3 space-y-2 pl-6 text-[18px] text-blue-800 list-decimal">
                        <li>Find a nearby ATM</li>
                        <li>Insert your debit card and enter PIN</li>
                        <li>Select "Deposit"</li>
                        <li>Insert cash or checks</li>
                        <li>Confirm the amount and complete transaction</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {selectedAccount && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[16px] text-slate-600">
                    Current balance:{" "}
                    <span className="font-semibold text-slate-900">
                      ${Number(selectedAccount.balance).toFixed(2)}
                    </span>
                  </div>
                )}

                {msg && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] text-slate-700">
                    {msg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={loading || !accountId}
                  className="h-14 w-full rounded-2xl bg-slate-950 text-[20px] font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Recording..." : "Record ATM Deposit"}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-[22px] font-bold text-slate-900">Check Deposit</h2>
              <p className="mt-1 text-[18px] text-slate-500">
                Check deposit UI can be added later using the same card layout.
              </p>
            </div>

            <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-[18px] text-slate-500">
              Upload front/back check images here later.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}