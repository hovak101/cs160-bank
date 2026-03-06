"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CreditCard,
  ArrowDownLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      setLoading(false);
    }

    checkUser();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl xl:text-5xl">
          Dashboard
        </h2>
        <p className="mt-2 text-base text-slate-500 sm:mt-3 sm:text-lg xl:text-2xl">
          Overview of your banking accounts
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:p-8">
          <div className="flex items-start justify-between">
            <p className="text-lg font-semibold text-slate-800 sm:text-xl xl:text-2xl">
              Total Balance
            </p>
            <ArrowUpRight className="h-5 w-5 text-green-500 sm:h-6 sm:w-6" />
          </div>
          <p className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl xl:mt-10 xl:text-5xl">
            $2,651.25
          </p>
          <p className="mt-2 text-sm text-slate-500 sm:text-base xl:mt-3 xl:text-xl">
            Across all accounts
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:p-8">
          <div className="flex items-start justify-between">
            <p className="text-lg font-semibold text-slate-800 sm:text-xl xl:text-2xl">
              Active Accounts
            </p>
            <CreditCard className="h-5 w-5 text-blue-500 sm:h-6 sm:w-6" />
          </div>
          <p className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl xl:mt-10 xl:text-5xl">
            2
          </p>
          <p className="mt-2 text-sm text-slate-500 sm:text-base xl:mt-3 xl:text-xl">
            Banking accounts
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:p-8">
          <div className="flex items-start justify-between">
            <p className="text-lg font-semibold text-slate-800 sm:text-xl xl:text-2xl">
              Recent Deposits
            </p>
            <ArrowDownLeft className="h-5 w-5 text-green-500 sm:h-6 sm:w-6" />
          </div>
          <p className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl xl:mt-10 xl:text-5xl">
            2
          </p>
          <p className="mt-2 text-sm text-slate-500 sm:text-base xl:mt-3 xl:text-xl">
            Last 30 days
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:p-8">
          <div className="flex items-start justify-between">
            <p className="text-lg font-semibold text-slate-800 sm:text-xl xl:text-2xl">
              Recent Withdrawals
            </p>
            <ArrowUpRight className="h-5 w-5 text-red-500 sm:h-6 sm:w-6" />
          </div>
          <p className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl xl:mt-10 xl:text-5xl">
            1
          </p>
          <p className="mt-2 text-sm text-slate-500 sm:text-base xl:mt-3 xl:text-xl">
            Last 30 days
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:p-8">
        <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Your Accounts
        </h3>

        <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="rounded-full bg-blue-100 p-3 sm:p-4">
                <CreditCard className="h-6 w-6 text-blue-600 sm:h-8 sm:w-8" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 sm:text-2xl xl:text-3xl">
                  Checking Account
                </p>
                <p className="text-base text-slate-400 sm:text-lg xl:text-2xl">
                  ••••7890
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl xl:text-4xl">
                $5,420.50
              </p>
              <p className="text-base text-slate-400 sm:text-lg xl:text-2xl">
                active
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="rounded-full bg-blue-100 p-3 sm:p-4">
                <CreditCard className="h-6 w-6 text-blue-600 sm:h-8 sm:w-8" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 sm:text-2xl xl:text-3xl">
                  Savings Account
                </p>
                <p className="text-base text-slate-400 sm:text-lg xl:text-2xl">
                  ••••7891
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl xl:text-4xl">
                $15,230.75
              </p>
              <p className="text-base text-slate-400 sm:text-lg xl:text-2xl">
                active
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:p-8">
        <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Recent Transactions
        </h3>
        <div className="mt-5 h-28 rounded-2xl bg-slate-50 sm:mt-6 sm:h-40" />
      </div>
    </div>
  );
}