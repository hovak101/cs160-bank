import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Building2,
  HandCoins,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

const actions = [
  {
    name: "Customer Accounts",
    href: "/admin/accounts",
    description: "Review balances, statuses, and account mix.",
    icon: Building2,
  },
  {
    name: "Transactions",
    href: "/admin/transactions",
    description: "Inspect transfers, fees, and recent activity.",
    icon: ArrowRightLeft,
  },
  {
    name: "Deposits",
    href: "/admin/deposits",
    description: "Monitor incoming funds and approvals.",
    icon: ArrowDownLeft,
  },
  {
    name: "Withdrawals",
    href: "/admin/withdrawals",
    description: "Track outgoing cash and exceptions quickly.",
    icon: ArrowUpRight,
  },
  {
    name: "Loans",
    href: "/admin/loans",
    description: "Approve applications and watch outstanding balances.",
    icon: HandCoins,
  },
  {
    name: "User Management",
    href: "/admin/users",
    description: "View customers and manage user records.",
    icon: Users,
  },
  {
    name: "Managers",
    href: "/admin/managers",
    description: "Control admin and manager access centrally.",
    icon: UserCog,
  },
];

export function QuickActions() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#0c162a] p-6 shadow-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
          <p className="text-sm text-slate-400">
            Fast routes to the main admin workflows.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
          Admin tools
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <QuickActionCard key={action.name} {...action} />
        ))}
      </div>
    </section>
  );
}

function QuickActionCard({
  name,
  href,
  description,
  icon: Icon,
}: {
  name: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-[#0a1324] p-4 transition hover:border-cyan-400/40 hover:bg-cyan-400/5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300 transition group-hover:bg-cyan-400/15">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-slate-500 transition group-hover:text-cyan-300">
          Open
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-white">{name}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
      </div>
    </Link>
  );
}
