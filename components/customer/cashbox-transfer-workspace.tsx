"use client";

import { useState } from "react";
import { ArrowDownToLine, Send } from "lucide-react";
import CashboxSendForm from "@/components/customer/cashbox-send-form";
import CashboxWithdrawForm from "@/components/customer/cashbox-withdraw-form";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

type CashboxMode = "send" | "withdraw";

export function CashboxTransferWorkspace({
  accounts,
  cashboxBalance,
}: {
  accounts: Account[];
  cashboxBalance: number;
}) {
  const [activeMode, setActiveMode] = useState<CashboxMode>("send");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
        <div>
          <h2 className="text-xl font-bold text-white">CashBox Transfers</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Send funds to another user by phone number or withdraw your CashBox
            balance into one of your deposit accounts.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">CashBox Balance</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatCurrency(cashboxBalance)}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveMode("send")}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              activeMode === "send"
                ? "border-cyan-400 bg-cyan-400/10 text-white"
                : "border-white/10 bg-slate-950/70 text-slate-300 hover:border-cyan-400/40"
            }`}
          >
            <Send className="mb-3 text-cyan-400" size={18} />
            <p className="font-semibold">Send by Phone</p>
            <p className="mt-1 text-sm text-slate-400">
              Send money from an account or CashBox to another user.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("withdraw")}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              activeMode === "withdraw"
                ? "border-cyan-400 bg-cyan-400/10 text-white"
                : "border-white/10 bg-slate-950/70 text-slate-300 hover:border-cyan-400/40"
            }`}
          >
            <ArrowDownToLine className="mb-3 text-cyan-400" size={18} />
            <p className="font-semibold">Withdraw to Account</p>
            <p className="mt-1 text-sm text-slate-400">
              Move money from CashBox into one of your active accounts.
            </p>
          </button>
        </div>
      </section>

      {activeMode === "send" ? (
        <CashboxSendForm
          accounts={accounts}
          cashboxBalance={cashboxBalance}
          embedded
          continueHref="/customer/transfers?mode=cashbox"
        />
      ) : null}

      {activeMode === "withdraw" ? (
        <CashboxWithdrawForm
          accounts={accounts}
          cashboxBalance={cashboxBalance}
          embedded
          continueHref="/customer/transfers?mode=cashbox"
        />
      ) : null}
    </div>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}
