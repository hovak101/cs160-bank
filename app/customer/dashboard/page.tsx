import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Landmark,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  MapPin,
  ScanLine,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

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
    href: "/customer/atm",
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
    <div className="min-h-svh bg-[#0b1220] text-slate-100">
      <div className="border-b border-white/10 bg-[#0f172a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-2 shadow-[0_0_30px_-10px_hsl(174_72%_42%_/_0.35)]">
              <Landmark className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">
                Vitality <span className="text-cyan-400">Bank</span>
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Customer Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-200">{displayName}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(174_72%_42%_/_0.12),transparent_70%)] bg-[#0f172a] p-6 shadow-[0_0_40px_-8px_hsl(12_85%_60%_/_0.12)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
                Customer Dashboard
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
                Access your banking tools, review account activity, and manage
                upcoming actions from one secure workspace.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Status
                </p>
                <p className="mt-1 text-sm font-semibold text-white">Active</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Role
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Customer
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 col-span-2 sm:col-span-1">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Security
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Authenticated
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-[#0f172a] text-white shadow-[0_0_40px_-8px_hsl(12_85%_60%_/_0.10)]">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">
                Accounts Overview
              </CardDescription>
              <CardTitle className="text-2xl">$0.00</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Connect account data here when the accounts API is ready.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0f172a] text-white shadow-[0_0_40px_-8px_hsl(12_85%_60%_/_0.10)]">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">
                Pending Payments
              </CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Scheduled bill payments will appear here.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0f172a] text-white shadow-[0_0_40px_-8px_hsl(12_85%_60%_/_0.10)]">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">
                Recent Transactions
              </CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Transaction activity will populate here after integration.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Quick Actions
              </h2>
              <p className="text-sm text-slate-400">
                Core customer features and planned banking tools.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.title} href={item.href}>
                  <Card className="h-full border-white/10 bg-[#0f172a] text-white transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-[0_0_40px_-8px_hsl(174_72%_42%_/_0.25)]">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                        <Icon className="h-5 w-5 text-cyan-400" />
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          item.badge === "Core"
                            ? "bg-cyan-400/10 text-cyan-300"
                            : "bg-orange-400/10 text-orange-300"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </CardHeader>

                    <CardContent>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}