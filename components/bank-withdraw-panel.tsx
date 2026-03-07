"use client";

import { Smartphone, CircleDollarSign } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Account = {
  account_id: string;
  account_number: string;
  balance: number;
  status: string;
};

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function BankWithdrawPanel() {
  const supabase = createClient();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [nfcCode, setNfcCode] = useState("");
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

  function handleGenerateCode() {
    setNfcCode(generateCode());
  }

  async function handleWithdraw() {
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

    if (parsedAmount % 20 !== 0) {
      setMsg("ATM withdrawals must be in multiples of $20.");
      return;
    }

    if (!nfcCode) {
      setMsg("Please generate an NFC code first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/atm/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          amount: parsedAmount,
          description: `NFC ATM withdrawal code ${nfcCode}`,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json.error || "Withdrawal failed.");
      } else {
        setMsg(`Withdrawal approved. Your NFC code is ${nfcCode}.`);
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
          Withdraw Money
        </h1>
        <p className="mt-3 text-[18px] text-slate-500">
          Get cash from your account using NFC
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="space-y-6">
          <div>
            <h2 className="text-[22px] font-bold text-slate-900">
              NFC ATM Withdrawal
            </h2>
            <p className="mt-1 text-[18px] text-slate-500">
              Generate a secure code to withdraw cash at any ATM
            </p>
          </div>

          {fetching ? (
            <p className="text-slate-500">Loading accounts...</p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[18px] font-semibold text-slate-900">
                  Withdraw From Account
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
                  min="20"
                  step="20"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[18px] text-slate-700 outline-none focus:border-blue-400"
                />
                <p className="text-[16px] text-slate-500">
                  ATM withdrawals must be in multiples of $20
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[18px] font-semibold text-slate-900">
                  NFC Withdrawal Code
                </label>
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="flex h-14 flex-1 items-center rounded-2xl border border-slate-200 bg-white px-4 text-[22px] font-semibold tracking-[0.25em] text-slate-900">
                    {nfcCode || "------"}
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-[18px] font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    <Smartphone className="h-5 w-5" />
                    Generate NFC Code
                  </button>
                </div>
              </div>

              <div className="rounded-[22px] border border-blue-100 bg-blue-50 px-5 py-5">
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-blue-600">
                    <CircleDollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold text-blue-800">
                      How to use NFC withdrawal:
                    </h3>
                    <ol className="mt-3 space-y-2 pl-6 text-[18px] text-blue-800 list-decimal">
                      <li>Generate your NFC code above</li>
                      <li>Go to any ATM within 5 minutes</li>
                      <li>Select "Cardless Withdrawal"</li>
                      <li>Enter the 6-digit code shown above</li>
                      <li>Collect your cash</li>
                    </ol>
                    <p className="mt-3 text-[16px] text-blue-800">
                      No physical card needed! Your phone acts as your card.
                    </p>
                  </div>
                </div>
              </div>

              {selectedAccount && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[16px] text-slate-600">
                  Available balance:{" "}
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
                onClick={handleWithdraw}
                disabled={loading || !accountId}
                className="h-14 w-full rounded-2xl bg-slate-950 text-[20px] font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Processing..." : "Confirm Withdrawal"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}