import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QuickActions } from "@/components/admin/quick-actions";
import { AdminDashboardStats } from "@/components/admin/admin-dashboard-stats";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: userData } = await supabase
    .from("users")
    .select("email")
    .eq("user_id", user.id)
    .single();

  const email = userData?.email ?? "";
  const name =
    (user.user_metadata?.first_name as string | undefined) ??
    email?.split("@")[0] ??
    "Admin";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0c162a] p-6 shadow-2xl lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#22d3ee22,transparent_38%),radial-gradient(circle_at_right,#1d4ed833,transparent_34%)]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-teal-400">
              Admin Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white lg:text-[2.5rem]">
              Welcome back, {name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 lg:text-base">
              A cleaner view of operations, customer activity, and revenue so
              the most important bank signals are easier to scan.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                View
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                Monthly operations snapshot
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Focus
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                Accounts, cash flow, and bank income
              </p>
            </div>
          </div>
        </div>
      </section>

      <AdminDashboardStats />
      <QuickActions />
    </div>
  );
}
