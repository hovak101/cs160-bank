import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";

export const dynamic = "force-dynamic";
import { LogoutButton } from "@/components/logout-button";
import { ManagerDashboardStats } from "@/components/manager/dashboard-stats";

export default async function ManagerDashboardPage() {
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
    (user.user_metadata?.first_name as string | undefined) ?? email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a2847] to-[#0f172a]">
      <header className="border-b border-white/10 bg-[#0f172a]/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Landmark className="h-5 w-5 text-teal-400" />
            Vitality <span className="text-teal-400">Bank</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{email}</span>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl mb-8">
          <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
          <div className="relative z-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
              Manager Dashboard
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Welcome, Manager {name}
            </h1>
            <p className="mt-2 max-w-xl text-slate-400">
              Here's an overview of the bank's performance
            </p>
          </div>
        </section>

        <ManagerDashboardStats />
      </main>
    </div>
  );
}
