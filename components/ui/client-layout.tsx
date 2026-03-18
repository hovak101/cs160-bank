"use client";

import { useState } from "react";
import Sidebar from "./sidebar";
import { Menu, Bell } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export default function ClientLayout({ children, email }: { children: React.ReactNode; email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex h-screen bg-[#0b1220] overflow-hidden text-slate-100">
      
      {/* Sidebar Component */}
      <Sidebar open={open} setOpen={setOpen} />

      {/* Dimmed Background Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] transition-opacity duration-300"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 border-b border-white/5 bg-[#0b1220]/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
          <button onClick={() => setOpen(true)} className="text-white p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Menu size={24} />
          </button>

          <div className="ml-auto flex items-center gap-6">
            <button className="text-slate-400 hover:text-white"><Bell size={20} /></button>
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-500 font-medium">{email}</p>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}