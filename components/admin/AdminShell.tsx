"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, HandCoins, Landmark, LogOut, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Accounts",
    href: "/admin/accounts",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Transactions",
    href: "/admin/transactions",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
    {
    label: "Deposits",
    href: "/admin/deposits",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22l-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    label: "Withdrawals",
    href: "/admin/withdrawals",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22l-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    label: "Loans",
    href: "/admin/loans",
    icon: <HandCoins className="h-5 w-5" />,
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 5-6" />
      </svg>
    ),
  }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#020b1d] text-white">
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-cyan-500/10 bg-[#071326] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.18)]">
                  <Landmark className="h-5 w-5 text-cyan-400" />
                </div>

                <div className="leading-tight">
                  <p className="text-2xl font-bold">
                    Vitality <span className="text-cyan-400">Bank</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-3 flex-1 space-y-2 px-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                      isActive
                        ? "border border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-cyan-500/10 bg-[#051120]/95 px-6 backdrop-blur">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden items-center gap-2 md:flex">
              <Landmark className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">
                Vitality <span className="text-cyan-400">Bank</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-5">
            <button className="text-slate-400 transition hover:text-white">
              <Bell className="h-5 w-5" />
            </button>

            <span className="hidden text-sm text-slate-400 md:block">
              {userEmail}
            </span>

            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

export default AdminShell;
