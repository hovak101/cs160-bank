import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AtmSimulationForm } from "@/components/atm-simulation-form";
import type { AtmAction } from "@/lib/atm/demo";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ action?: string }>;

export default async function AtmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
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

  const [{ data: accounts }, { data: pendingSimulations }] = await Promise.all([
    supabase
      .from("accounts")
      .select(
        "account_id, account_name, account_number, account_type, balance, currency, status"
      )
      .eq("customer_id", customer.customer_id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    supabase
      .from("atm_simulations")
      .select(
        "atm_simulation_id, transaction_id, account_id, atm_id, atm_name, atm_location, action, amount, verification_code, status, created_at, completed_at"
      )
      .eq("customer_id", customer.customer_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const accountMap = new Map(
    (accounts ?? []).map((account) => [account.account_id, account] as const)
  );

  const pendingWithAccountDetails = (pendingSimulations ?? []).map((simulation) => {
    const account = accountMap.get(simulation.account_id);
    const action: AtmAction =
      simulation.action === "deposit" ? "deposit" : "withdraw";

    return {
      ...simulation,
      action,
      account_name: account?.account_name || "Account",
      account_type: account?.account_type || "",
      account_mask: account?.account_number?.slice(-4) || "",
      currency: account?.currency || "USD",
    };
  });

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            Customer Banking
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            ATM Deposit & Withdrawal
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Search for a nearby ATM, start a demo ATM transaction, and click{" "}
            <span className="font-semibold text-white">I finished</span> once the
            ATM step is done to complete the balance update.
          </p>
        </div>
      </section>

      <AtmSimulationForm
        accounts={accounts ?? []}
        initialAction={params.action}
        initialPendingSimulations={pendingWithAccountDetails}
      />
    </div>
  );
}
