"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  Send,
  Download,
  FileText,
  Settings,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/customer/dashboard" },
  { name: "Customer Accounts", icon: Users, href: "/customer/accounts" },
  { name: "Transactions", icon: ArrowRightLeft, href: "/customer/transactions" },
  { name: "Transfers", icon: Send, href: "/customer/transfers" },
  { name: "Deposits", icon: Download, href: "/customer/deposits" },
  { name: "Withdrawals", icon: Download, href: "/customer/withdrawals" },
  { name: "Reports", icon: FileText, href: "/customer/reports" },
  { name: "Settings", icon: Settings, href: "/customer/settings" },
];

export default function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();

  return (
    <div
      className={`fixed top-0 left-0 h-full w-64 bg-[#0f172a] text-white
      transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] z-50
      ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      {/* Logo */}
      <div className="p-4 text-teal-400 font-semibold text-lg">
        Vitality Bank
      </div>

      {/* Menu */}
      <nav className="flex flex-col gap-2 px-2">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={i}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition
                ${
                  isActive
                    ? "bg-teal-500/20 text-teal-400"
                    : "hover:bg-teal-500/10 hover:text-teal-400"
                }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}