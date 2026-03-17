import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Landmark, LayoutDashboard } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileIncomplete =
    customerError ||
    !customer ||
    !customer.first_name?.trim() ||
    !customer.last_name?.trim();

  if (profileIncomplete) {
    redirect("/customer/onboarding");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("email")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = userData?.email ?? user.email ?? "";
  const name = `${customer.first_name} ${customer.last_name}`;

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
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

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-widest text-teal-600">
            Customer Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Welcome back, {name}
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["Accounts", "Transactions", "Bill Pay"].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-[0_0_40px_-8px_hsl(174_72%_42%_/_0.25)]"
            >
              <LayoutDashboard className="mb-3 h-5 w-5 text-teal-500" />
              <p className="font-medium text-slate-800">{item}</p>
              <p className="mt-1 text-xs text-slate-400">Coming soon</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}