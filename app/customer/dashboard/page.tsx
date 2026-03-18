import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Landmark, Wallet, ArrowLeftRight, CreditCard, MapPin, ScanLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
export const dynamic = "force-dynamic";
const quickActions = [
  {
    title: "Accounts",
    description: "View balances, account details, and recent activity.",
    href: "/customer/accounts",
    icon: Wallet,
    badge: "Core",
  },
  {
    title: "Transactions",
    description: "Track deposits, withdrawals, and transfer history.",
    href: "/customer/transactions",
    icon: ArrowLeftRight,
    badge: "Core",
  },
  {
    title: "Bill Pay",
    description: "Manage and schedule payments from checking accounts.",
    href: "/customer/bill-pay",
    icon: CreditCard,
    badge: "Planned",
  },
  {
    title: "Find ATM",
    description: "Locate the nearest Chase ATM from your current area.",
    href: "/customer/dashboard/find-atm",
    icon: MapPin,
    badge: "Planned",
  },
  {
    title: "Cheque Deposit",
    description: "Deposit a cheque using your camera or screenshot upload.",
    href: "/customer/deposit-cheque",
    icon: ScanLine,
    badge: "Planned",
  },
];

export default async function CustomerDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("first_name,last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "Customer";

  return (
    
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2">Customer Dashboard</p>
          <h1 className="text-4xl font-bold text-white tracking-tight">Welcome back, {displayName}</h1>
          <p className="mt-2 text-slate-400 max-w-xl">Access your banking tools from one secure workspace.</p>
        </div>
      </section>

      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard title="Accounts Overview" value="$0.00" />
        <MetricCard title="Pending Payments" value="0" />
        <MetricCard title="Recent Transactions" value="0" />
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((item) => (
            <Link key={item.title} href={item.href}>
              <Card className="bg-[#0f172a] border-white/10 hover:border-cyan-400/50 transition-all p-6 group cursor-pointer">
                <div className="p-3 rounded-xl bg-cyan-400/10 text-cyan-400 w-fit mb-4">
                  <item.icon size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{item.description}</p>
              </Card>
            </Link>
          ))}

        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="bg-[#0f172a] border-white/10 p-6 text-white">
      <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </Card>
  );
}