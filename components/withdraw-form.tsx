"use client";

import { AtmSimulationForm } from "@/components/atm-simulation-form";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

export function WithdrawForm({ accounts }: { accounts: Account[] }) {
  return <AtmSimulationForm accounts={accounts} initialAction="withdraw" />;
}
