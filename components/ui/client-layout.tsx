"use client";

import { useState } from "react";
import Sidebar from "./sidebar";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export default function ClientLayout({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={open} />

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col relative z-10">
        <div className="h-14 bg-white shadow-md">
          <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
            
            <div className="flex items-center gap-3">
              <button onClick={() => setOpen(!open)}>
                {open ? (
                  <X className="w-6 h-6 transparent" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600" />
                )}
              </button>

              <span className="font-semibold text-gray-900">
                Vitality <span className="text-teal-500">Bank</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{email}</span>
              <LogoutButton variant="ghost" />
            </div>
          </div>
        </div>

        <main className="flex-1 bg-slate-50 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}