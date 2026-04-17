import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DepositChequeForm } from "@/components/deposit-cheque-form";
import { isDepositEligible } from "@/lib/banking/rules";

export const dynamic = "force-dynamic";

export default async function DepositChequePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer) redirect("/customer/onboarding");

  const { data: accounts } = await supabase
    .from("accounts")
    .select(
      "account_id, account_name, account_number, account_type, balance, currency, status"
    )
    .eq("customer_id", customer.customer_id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const depositEligibleAccounts =
    (accounts ?? []).filter((account) => isDepositEligible(account.account_type));

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            Customer Banking
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Cheque Deposit
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Upload a cheque image, enter the amount, and deposit funds into one
            of your accounts.
          </p>
        </div>
      </section>

      <DepositChequeForm accounts={depositEligibleAccounts} />
    </div>
  );
}
