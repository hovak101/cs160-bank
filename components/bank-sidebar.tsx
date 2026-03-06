"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  CreditCard,
  ArrowLeftRight,
  Wallet,
  CircleDollarSign,
  FileText,
  MapPin,
  Receipt,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/deposit", label: "Deposit", icon: Wallet },
  { href: "/withdraw", label: "Withdraw", icon: CircleDollarSign },
  { href: "/bill-pay", label: "Bill Pay", icon: FileText },
  { href: "/find-atm", label: "Find ATM", icon: MapPin },
  { href: "/transactions", label: "Transactions", icon: Receipt },
];

type Props = {
  onNavigate?: () => void;
};

export default function BankSidebar({ onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={[
                "flex items-center gap-4 rounded-2xl px-4 py-3 text-base sm:px-5 sm:py-4 sm:text-lg font-medium transition",
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}