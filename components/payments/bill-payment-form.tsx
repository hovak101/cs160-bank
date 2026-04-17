"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { isCheckingAccount } from "@/lib/banking/rules";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type?: string;
};

export function BillPaymentForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: customer } = await supabase
          .from("customers")
          .select("customer_id")
          .eq("user_id", user.id)
          .single();

        if (customer) {
          const { data: accountsData } = await supabase
            .from("accounts")
            .select("account_id, account_name, account_number, account_type")
            .eq("customer_id", customer.customer_id);
          
          setAccounts((accountsData || []).filter((account) => isCheckingAccount(account.account_type)));
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      } finally {
        setLoadingAccounts(false);
      }
    }
    fetchAccounts();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/bill-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          amount: parseFloat(payload.amount as string),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create schedule");

      toast.success("Schedule created successfully!");
      window.location.reload(); 
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass = "flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 appearance-none cursor-pointer";

  return (
    <Card className="bg-white/5 border-white/10 text-white shadow-[0_0_40px_-8px_rgba(34,211,238,0.15)]">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-cyan-400 uppercase tracking-tight">
          New Bill Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Source Account - Dynamic Dropdown */}
          <div className="space-y-2">
            <Label>Source Account</Label>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <Loader2 className="animate-spin" size={14} /> SYNCING VAULT...
              </div>
            ) : (
              <select name="account_id" className={selectClass} required>
                <option value="" className="bg-[#0f172a]">Select Source Account</option>
                {accounts.map(acc => (
                <option key={acc.account_id} value={acc.account_id} className="bg-[#0f172a]">
                  {acc.account_name} (****{acc.account_number.slice(-4)})
                </option>
                ))}
              </select>
            )}
          </div>

          {/* Payee Account - Text Input (For External IDs) */}
          <div className="space-y-2">
            <Label htmlFor="payee_account_id">Payee Account ID</Label>
            <Input 
              id="payee_account_id"
              name="payee_account_id" 
              placeholder="Enter Recipient UUID" 
              className="bg-white/5 border-white/10 focus:border-cyan-400" 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input name="amount" type="number" step="0.01" placeholder="0.00" className="bg-white/5 border-white/10 focus:border-cyan-400" required />
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <select name="frequency" className={selectClass} defaultValue="monthly">
                <option value="once" className="bg-[#0f172a]">Once</option>
                <option value="weekly" className="bg-[#0f172a]">Weekly</option>
                <option value="biweekly" className="bg-[#0f172a]">Bi-Weekly</option>
                <option value="monthly" className="bg-[#0f172a]">Monthly</option>
                <option value="annually" className="bg-[#0f172a]">Annually</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input name="start_date" type="date" className="bg-white/5 border-white/10 text-xs focus:border-cyan-400" required />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input name="end_date" type="date" className="bg-white/5 border-white/10 text-xs focus:border-cyan-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nickname</Label>
            <Input name="nickname" placeholder="e.g. Electricity Bill" className="bg-white/5 border-white/10 focus:border-cyan-400" />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#0f172a] font-bold uppercase tracking-wider transition-all" 
            disabled={submitting || loadingAccounts}
          >
            {submitting ? "Processing..." : "Confirm Schedule"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
