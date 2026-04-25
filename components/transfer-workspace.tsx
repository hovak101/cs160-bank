"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Inbox, Landmark } from "lucide-react";
import { CashboxTransferWorkspace } from "@/components/customer/cashbox-transfer-workspace";
import { ExternalTransferForm } from "@/components/external-transfer-form";
import { TransferForm } from "@/components/transfer-form";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

type TransferMode = "internal" | "cashbox" | "external";

const MODE_OPTIONS: Array<{
  mode: TransferMode;
  title: string;
  description: string;
  icon: typeof ArrowLeftRight;
}> = [
  {
    mode: "internal",
    title: "Internal Transfer",
    description: "Move money between your CS160 Bank accounts or pay your credit card.",
    icon: ArrowLeftRight,
  },
  {
    mode: "cashbox",
    title: "CashBox",
    description: "Send by phone number or move CashBox funds into your accounts.",
    icon: Inbox,
  },
  {
    mode: "external",
    title: "External Transfer",
    description: "Move money between CS160 Bank and a linked Plaid account.",
    icon: Landmark,
  },
];

function normalizeMode(value: string | undefined): TransferMode {
  if (value === "cashbox" || value === "external") {
    return value;
  }

  return "internal";
}

export function TransferWorkspace({
  accounts,
  cashboxBalance,
  initialMode = "internal",
  isSandboxDemo = false,
}: {
  accounts: Account[];
  cashboxBalance: number;
  initialMode?: string;
  isSandboxDemo?: boolean;
}) {
  const [activeMode, setActiveMode] = useState<TransferMode>(
    normalizeMode(initialMode)
  );

  useEffect(() => {
    setActiveMode(normalizeMode(initialMode));
  }, [initialMode]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
        <div>
          <h2 className="text-xl font-bold text-white">Choose a Transfer Type</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Use the buttons below to switch between account-to-account transfers,
            CashBox transfers, or Plaid external transfers without
            leaving the page.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = activeMode === option.mode;

            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => setActiveMode(option.mode)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-cyan-400 bg-cyan-400/10 text-white"
                    : "border-white/10 bg-slate-950/70 text-slate-300 hover:border-cyan-400/40"
                }`}
              >
                <Icon className="mb-3 text-cyan-400" size={18} />
                <p className="font-semibold">{option.title}</p>
                <p className="mt-1 text-sm text-slate-400">{option.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {activeMode === "internal" ? <TransferForm accounts={accounts} /> : null}
      {activeMode === "cashbox" ? (
        <CashboxTransferWorkspace
          accounts={accounts}
          cashboxBalance={cashboxBalance}
        />
      ) : null}
      {activeMode === "external" ? (
        <ExternalTransferForm
          accounts={accounts}
          isSandboxDemo={isSandboxDemo}
        />
      ) : null}
    </div>
  );
}
