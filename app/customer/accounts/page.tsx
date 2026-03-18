import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Landmark, Calendar, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OpenAccountForm } from "@/components/customer/open-account-form";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return <div className="p-10 text-center">Customer profile not found.</div>;
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("customer_id", customer.customer_id);

  return (
    <main className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Accounts</h1>
          <p className="text-slate-500 text-sm">Manage your banking accounts</p>
        </div>
        <OpenAccountForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts?.map((acc) => (
          /* FIX: Use acc.account_id for the key */
          <Card key={acc.account_id} className="p-6 overflow-hidden border-slate-200 hover:border-teal-200 transition-all group">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 rounded-2xl text-teal-600">
                  <Landmark size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{acc.account_name}</h3>
                  <p className="text-xs font-mono text-slate-400">Account #: ••••{acc.account_number.slice(-4)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Balance</p>
              <p className="text-4xl font-bold text-slate-900">
                {/* Ensure currency symbol matches your currency column if needed */}
                ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[11px] font-medium uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Status</span>
                <span className="flex items-center gap-1 text-teal-600 font-bold">
                   {acc.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                Opened {new Date(acc.created_at).toLocaleDateString()}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}