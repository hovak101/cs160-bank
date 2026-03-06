"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setMsg("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setSuccess("Account created successfully. Please sign in.");
    setTimeout(() => {
      router.push("/");
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-slate-900">
                Create Account
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Start with your email and password
              </p>
            </div>

            {msg && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {msg}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>

              <div className="text-center">
                <Link
                  href="/"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Back to Sign In
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