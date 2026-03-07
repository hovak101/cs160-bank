"use client";

import {
  BadgeCheck,
  FileText,
  Plus,
  CircleX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Schedule = {
  schedule_id: string;
  nickname: string;
  amount: number;
  next_payment_date: string;
  status: string;
  account_id: string;
  frequency: string;
};

type Account = {
  account_id: string;
  account_number: string;
};

export function BankBillPayPanel() {
  const supabase = createClient();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSetup, setShowSetup] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [accountId, setAccountId] = useState("");
  const [nickname, setNickname] = useState("");
  const [payeeId, setPayeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [creating, setCreating] = useState(false);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.account_id, a.account_number));
    return map;
  }, [accounts]);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMsg("You must be logged in.");
        setLoading(false);
        return;
      }

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (customerError || !customer) {
        setMsg("Customer profile not found.");
        setLoading(false);
        return;
      }

      const { data: accountRows, error: accountsError } = await supabase
        .from("accounts")
        .select("account_id, account_number")
        .eq("customer_id", customer.customer_id)
        .eq("status", "active");

      if (accountsError) {
        setMsg(accountsError.message);
        setLoading(false);
        return;
      }

      const finalAccounts = accountRows || [];
      setAccounts(finalAccounts);

      if (finalAccounts.length > 0 && !accountId) {
        setAccountId(finalAccounts[0].account_id);
      }

      const res = await fetch("/api/bill/list");
      const json = await res.json();

      if (!res.ok) {
        setMsg(json.error || "Failed to load bill schedules.");
      } else {
        setSchedules(json.schedules || []);
      }
    } catch {
      setMsg("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    setMsg(null);

    if (!accountId || !nickname || !payeeId || !amount || !startDate) {
      setMsg("Please fill in all required fields.");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/bill/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          payeeId,
          nickname,
          amount: Number(amount),
          frequency,
          startDate,
          endDate: null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json.error || "Failed to create payment.");
      } else {
        setMsg("Bill payment created.");
        setNickname("");
        setPayeeId("");
        setAmount("");
        setFrequency("monthly");
        setStartDate("");
        setShowSetup(false);
        await loadAll();
      }
    } catch {
      setMsg("Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[44px] leading-none font-bold tracking-tight text-slate-900">
            Bill Payments
          </h1>
          <p className="mt-3 text-[18px] text-slate-500">
            Set up and manage automated payments
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSetup((v) => !v)}
          className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 text-[20px] font-semibold text-white transition hover:bg-slate-900"
        >
          <Plus className="h-5 w-5" />
          Setup New Payment
        </button>
      </div>

      {showSetup && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-6">
            <h2 className="text-[24px] font-bold text-slate-900">
              Setup New Payment
            </h2>
            <p className="mt-1 text-[17px] text-slate-500">
              Create an automated bill payment schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[18px] font-semibold text-slate-900">
                From Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[18px] outline-none focus:border-blue-400"
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    Checking ••••{acc.account_number?.slice(-4)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[18px] font-semibold text-slate-900">
                Payment Name
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Electric Company"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[18px] outline-none focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[18px] font-semibold text-slate-900">
                Payee ID
              </label>
              <input
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                placeholder="payee uuid"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[18px] outline-none focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[18px] font-semibold text-slate-900">
                Amount
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="120.50"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[18px] outline-none focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[18px] font-semibold text-slate-900">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[18px] outline-none focus:border-blue-400"
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[18px] font-semibold text-slate-900">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[18px] outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {msg && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] text-slate-700">
              {msg}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="h-14 rounded-2xl bg-slate-950 px-6 text-[18px] font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Payment"}
            </button>

            <button
              type="button"
              onClick={() => setShowSetup(false)}
              className="h-14 rounded-2xl border border-slate-200 bg-white px-6 text-[18px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Loading bill payments...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {schedules.map((item) => {
              const accountNumber = accountMap.get(item.account_id) || "0000";

              return (
                <div
                  key={item.schedule_id}
                  className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <FileText className="h-7 w-7" />
                      </div>

                      <div>
                        <h3 className="text-[22px] font-bold text-slate-900">
                          {item.nickname}
                        </h3>
                        <p className="text-[18px] text-slate-500 capitalize">
                          {item.frequency} Payment
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-red-500 transition hover:text-red-600"
                    >
                      <CircleX className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="mt-8 space-y-4 text-[18px]">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">Amount</span>
                      <span className="text-[22px] font-bold text-slate-900">
                        ${Number(item.amount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">From Account</span>
                      <span className="font-semibold text-slate-900">
                        Checking ••••{accountNumber.slice(-4)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">Next Payment</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(item.next_payment_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="my-5 h-px bg-slate-200" />

                  <div className="flex items-center gap-3 text-[18px] font-semibold text-green-600">
                    <BadgeCheck className="h-5 w-5" />
                    Active
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-[28px] border border-blue-200 bg-blue-50 px-7 py-7">
            <h3 className="text-[24px] font-bold text-blue-800">
              Benefits of Automated Payments
            </h3>

            <ul className="mt-5 space-y-4 text-[18px] text-blue-800">
              <li className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                Never miss a payment deadline
              </li>
              <li className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                Avoid late fees and maintain good credit
              </li>
              <li className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                Save time managing monthly bills
              </li>
              <li className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                Easy to cancel or modify anytime
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}