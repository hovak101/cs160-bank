"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setMsg(error.message);
      return;
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setLoading(false);
      setMsg("Login succeeded but session could not be loaded.");
      return;
    }

    const { data: customer, error: customerErr } = await supabase
      .from("customers")
      .select(
        "first_name, last_name, phone_number, address_line_1, city, state, zip_code, country"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    setLoading(false);

    if (customerErr) {
      setMsg(customerErr.message);
      return;
    }

    const isProfileComplete =
      !!customer?.first_name &&
      !!customer?.last_name &&
      !!customer?.phone_number &&
      !!customer?.address_line_1 &&
      !!customer?.city &&
      !!customer?.state &&
      !!customer?.zip_code &&
      !!customer?.country;

    router.refresh();

    if (!isProfileComplete) {
      router.push("/complete-profile");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 10h18" />
                  <path d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
                  <path d="M6 10v9" />
                  <path d="M10 10v9" />
                  <path d="M14 10v9" />
                  <path d="M18 10v9" />
                  <path d="M4 19h16" />
                </svg>
              </div>
            </div>

            <div className="mt-5 text-center">
              <h1 className="text-xl font-semibold text-slate-900">
                Online-Only Banking
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to access your account
              </p>
            </div>

            {msg && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {msg}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="mt-2 relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    ✉
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="mt-2 relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    🔒
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-300"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              <div className="flex items-center justify-end pt-1">
                <Link
                  href="/auth/sign-up"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Create account
                </Link>
              </div>
            </form>
          </div>

          <div className="h-3 bg-gradient-to-b from-white to-slate-50" />
        </div>
      </div>
    </main>
  );
}