"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tx = {
  transaction_id: string;
  reference_number: string;
  amount: number;
  transaction_type: string;
  status: string;
  description: string | null;
  executed_at: string;
};

export function TransactionsList() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadTransactions() {
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
        .single();

      if (customerError || !customer) {
        setMsg("Customer profile not found.");
        setLoading(false);
        return;
      }

      const { data: accounts, error: accountError } = await supabase
        .from("accounts")
        .select("account_id")
        .eq("customer_id", customer.customer_id);

      if (accountError || !accounts?.length) {
        setMsg("No accounts found.");
        setLoading(false);
        return;
      }

      const ids = accounts.map((a) => a.account_id);

      const { data, error } = await supabase
        .from("transactions")
        .select(
          "transaction_id, reference_number, amount, transaction_type, status, description, executed_at, source_account_id, destination_account_id"
        )
        .or(
          ids
            .map(
              (id) =>
                `source_account_id.eq.${id},destination_account_id.eq.${id}`
            )
            .join(",")
        )
        .order("executed_at", { ascending: false })
        .limit(25);

      if (error) {
        setMsg(error.message);
      } else {
        setTransactions(data || []);
      }

      setLoading(false);
    }

    loadTransactions();
  }, [supabase]);

  if (loading) return <p className="text-slate-500">Loading transactions...</p>;
  if (msg) return <p className="text-slate-500">{msg}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Executed</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.transaction_id} className="border-b border-slate-100">
              <td className="px-4 py-3">{tx.reference_number}</td>
              <td className="px-4 py-3 capitalize">{tx.transaction_type}</td>
              <td className="px-4 py-3 font-medium">${Number(tx.amount).toFixed(2)}</td>
              <td className="px-4 py-3 capitalize">{tx.status}</td>
              <td className="px-4 py-3">{tx.description || "-"}</td>
              <td className="px-4 py-3">
                {new Date(tx.executed_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}