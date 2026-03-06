"use client";

import { useState } from "react";
import { X } from "lucide-react";
import BankSidebar from "@/components/bank-sidebar";
import BankTopbar from "@/components/bank-topbar";

type Props = {
  children: React.ReactNode;
};

export default function BankShell({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <BankTopbar onOpenMenu={() => setMobileOpen(true)} />

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] lg:gap-8">
          <div className="hidden lg:block lg:sticky lg:top-32 lg:self-start">
            <BankSidebar />
          </div>

          <section className="min-w-0">{children}</section>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu overlay"
          />

          <div className="absolute left-0 top-0 h-full w-[84%] max-w-[340px] bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-slate-900">Menu</p>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <BankSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}