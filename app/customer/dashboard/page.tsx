import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Landmark, ReceiptText, ArrowRightLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch user data for the email
  const { data: userData } = await supabase
    .from("users")
    .select("email")
    .eq("user_id", user.id)
    .single();

  const email = userData?.email ?? user.email ?? "";
  const name = (user.user_metadata?.first_name as string | undefined) ?? email;

  // Navigation items for the dashboard grid
  const dashboardActions = [
    { 
      name: "Accounts", 
      icon: Landmark, 
      href: "/customer/accounts", 
      desc: "View your balances" 
    },
    { 
      name: "Transactions", 
      icon: ArrowRightLeft, 
      href: "/customer/transactions", 
      desc: "Recent activity" 
    },
    { 
      name: "Bill Pay", 
      icon: ReceiptText, 
      href: "/customer/bill-pay", 
      desc: "Pay upcoming bills" 
    },
  ];
  return (
    <>
      {/* <header className="border-b border-slate-200 bg-white">
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
      </header> */}

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
    <div className="mb-8">
      <p className="text-sm font-medium text-teal-600 uppercase tracking-widest">
        Customer Dashboard
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">
        Welcome back, {name}
      </h1>
    </div>
    <div className="mb-10 p-8 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
      <div className="relative z-10">
        <p className="text-teal-400 text-sm font-medium uppercase tracking-wider">Total Balance</p>
        <h2 className="text-4xl font-bold mt-2">$24,560.00</h2>
      </div>
      <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {dashboardActions.map((item) => (
        <Link key={item.name} href={item.href} className="group">
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm 
                        transition-all duration-300
                        group-hover:shadow-[0_0_40px_-8px_rgba(20,184,166,0.25)] 
                        group-hover:border-teal-200 group-hover:-translate-y-1">
            <item.icon className="h-6 w-6 text-teal-500 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-slate-800">{item.name}</p>
            <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  </main>
    </>
  );
}
