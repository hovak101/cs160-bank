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
    <div className="px-6 py-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl mb-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            Admin Dashboard
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Welcome, Admin {name}
          </h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Here&apos;s an overview of the bank&apos;s real performance.
          </p>
        </div>
      </section>

      <AdminDashboardStats />

      <div className="mt-8">
        <QuickActions />
      </div>
    </div>
  );
}