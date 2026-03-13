import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Landmark, LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";
import { LogoutButton } from "@/components/logout-button";

export default async function CustomerDashboardPage() {
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
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Landmark className="h-5 w-5 text-teal-500" />
            Vitality <span className="text-teal-500">Bank</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{email}</span>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-teal-600 uppercase tracking-widest">
            Customer Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Welcome back, {name}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["Accounts", "Transactions", "Bill Pay"].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-[0_0_40px_-8px_hsl(174_72%_42%_/_0.25)] transition"
            >
              <LayoutDashboard className="h-5 w-5 text-teal-500 mb-3" />
              <p className="font-medium text-slate-800">{item}</p>
              <p className="mt-1 text-xs text-slate-400">Coming soon</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
