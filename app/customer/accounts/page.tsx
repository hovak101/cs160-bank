import { CloseAccountButton } from "@/components/customer/close-account-button";
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
      <section className="relative overflow-hidden rounded-[32px] mb-8 border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
              Customer Banking
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Accounts
            </h1>
            <p className="mt-2 max-w-5xl text-slate-400 leading-relaxed">
              Manage your banking accounts
            </p>
          </div>
          <div className="flex-shrink-0">
            <OpenAccountForm />
          </div>

        </div>
      </section>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts?.map((acc) => (
          <Card key={acc.account_id} className="p-6 overflow-hidden border-slate-200 hover:border-teal-200 transition-all group">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 rounded-2xl text-teal-600">
                  <Landmark size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{acc.account_name}</h3>
                  <p className="text-xs font-mono text-white">Account #: ••••{acc.account_number.slice(-4)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Balance</p>
              <p className="text-4xl font-bold text-white">
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
              <CloseAccountButton
                accountId={acc.account_id}
                status={acc.status}
              />
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
