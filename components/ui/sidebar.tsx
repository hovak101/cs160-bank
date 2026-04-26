"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  CreditCard,
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  Send,
  Settings,
  Landmark,
  CalendarClock,
  HandCoins,
  Inbox,
  ScanLine,
  X
} from "lucide-react";

export default function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const pathname = usePathname();

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      href: "/customer/dashboard",
      matchPrefixes: ["/customer/dashboard"],
      exact: true,
    },
    {
      name: "Accounts",
      icon: Users,
      href: "/customer/accounts",
      matchPrefixes: ["/customer/accounts"],
    },
    {
      name: "ATM",
      icon: Banknote,
      href: "/customer/atm",
      matchPrefixes: ["/customer/atm", "/customer/withdraw", "/customer/dashboard/find-atm"],
    },
    {
      name: "Transfers",
      icon: Send,
      href: "/customer/transfers",
      matchPrefixes: ["/customer/transfers"],
    },
    {
      name: "Transactions",
      icon: ArrowRightLeft,
      href: "/customer/transactions",
      matchPrefixes: ["/customer/transactions"],
    },
    {
      name: "Credit Card",
      icon: CreditCard,
      href: "/customer/credit-card",
      matchPrefixes: ["/customer/credit-card"],
    },
    {
      name: "CashBox",
      icon: Inbox,
      href: "/customer/cashbox",
      matchPrefixes: ["/customer/cashbox"],
    },
    {
      name: "Cheque Deposit",
      icon: ScanLine,
      href: "/customer/deposit-cheque",
      matchPrefixes: ["/customer/deposit-cheque"],
    },
    {
      name: "Loans",
      icon: HandCoins,
      href: "/customer/loans",
      matchPrefixes: ["/customer/loans"],
    },
    {
      name: "Bill Payments",
      icon: CalendarClock,
      href: "/customer/bill-payments",
      matchPrefixes: ["/customer/bill-payments"],
    },
    {
      name: "Settings",
      icon: Settings,
      href: "/customer/settings",
      matchPrefixes: ["/customer/settings"],
    },
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

      <nav className="mt-4 flex max-h-[calc(100vh-120px)] flex-col gap-1.5 overflow-y-auto px-4 pb-6">
        {menuItems.map((item) => {
          const isActive = item.matchPrefixes.some(
            (prefix) =>
              pathname === prefix ||
              (!item.exact && pathname.startsWith(`${prefix}/`))
          );

          return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all
              ${isActive
                  ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              }`}
          >
            <item.icon size={18} />
            <span className="font-medium text-sm">{item.name}</span>
          </Link>
          );
        })}
      </nav>
    </aside>
  );
}
