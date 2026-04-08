import Link from "next/link";

const actions = [
  { name: "Customer Accounts", href: "/admin/accounts" },
  { name: "Transactions", href: "/admin/transactions" },
  { name: "Deposits", href: "/admin/deposits" },
  { name: "Withdrawals", href: "/admin/withdrawals" },
  { name: "User Management", href: "/admin/users" },
  { name: "Managers", href: "/admin/managers" },
];

export function QuickActions() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-xl">
      <h2 className="text-xl font-semibold text-white mb-4">
        Quick Actions
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {actions.map((action) => (
          <Link
            key={action.name}
            href={action.href}
            className="group rounded-xl border border-white/10 bg-[#1a2847] p-4 hover:bg-teal-500/10 hover:border-teal-400 transition"
          >
            <div className="text-white font-medium group-hover:text-teal-400 transition">
              {action.name}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}