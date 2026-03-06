"use client";

import { LogOut, Landmark, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  onOpenMenu?: () => void;
};

export default function BankTopbar({ onOpenMenu }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("Customer");

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: customer } = await supabase
        .from("customers")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const name =
        [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
        user.email ||
        "Customer";

      setFullName(name);
    }

    loadUser();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-blue-500 bg-blue-600 shadow-md">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 text-white">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="rounded-2xl bg-white/10 p-2 hidden sm:block">
            <Landmark className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight sm:text-2xl">
              Online-Only Banking
            </h1>
            <p className="truncate text-sm text-blue-100 sm:text-base">
              Welcome, {fullName}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 sm:px-5 sm:py-3 sm:text-base"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}