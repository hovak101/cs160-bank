"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  Send,
  Settings,
  Landmark,
  CalendarClock, // Import this
  HandCoins,
  X
} from "lucide-react";

export default function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/customer/dashboard" },
    { name: "Accounts", icon: Users, href: "/customer/accounts" },
    { name: "Transactions", icon: ArrowRightLeft, href: "/customer/transactions" },
    { name: "Transfers", icon: Send, href: "/customer/transfers" },
    { name: "Loans", icon: HandCoins, href: "/customer/loans" },
    { name: "Bill Payments", icon: CalendarClock, href: "/customer/bill-payments" },
    { name: "Settings", icon: Settings, href: "/customer/settings" },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 w-72 bg-[#0f172a] border-r border-white/10 z-[60] 
      transform transition-transform duration-300 ease-in-out
      ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 shadow-[0_0_20px_-5px_#22d3ee]">
            <Landmark className="h-5 w-5 text-cyan-400" />
          </div>
          <span className="text-white font-bold text-xl">Vitality <span className="text-cyan-400">Bank</span></span>
        </div>
        <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <nav className="flex flex-col gap-1.5 px-4 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all
              ${pathname === item.href
                  ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              }`}
          >
            <item.icon size={18} />
            <span className="font-medium text-sm">{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
