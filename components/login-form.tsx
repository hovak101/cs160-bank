"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AppUserStatus = {
  is_active: boolean | null;
  account_locked_until: string | null;
  deactivation_reason: string | null;
};

export function LoginForm() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setMessage(error?.message || "Login failed.");
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    const { data: rawAppUser, error: userError } = await supabase
      .from("users")
      .select("is_active, account_locked_until, deactivation_reason")
      .eq("user_id", userId)
      .single();

    const appUser = rawAppUser as unknown as AppUserStatus | null;

    if (userError) {
      setMessage("Failed to verify account status.");
      setLoading(false);
      return;
    }

    if (appUser?.is_active === false) {
      await supabase.auth.signOut();

      router.push(
        `/auth/account-disabled?type=disabled&reason=${encodeURIComponent(
          appUser.deactivation_reason || "Your account has been disabled."
        )}`
      );
      return;
    }

    if (
      appUser?.account_locked_until &&
      new Date(appUser.account_locked_until).getTime() > Date.now()
    ) {
      await supabase.auth.signOut();

      router.push(
        `/auth/account-disabled?type=locked&reason=${encodeURIComponent(
          appUser.deactivation_reason || "Your account is temporarily locked."
        )}&until=${encodeURIComponent(appUser.account_locked_until)}`
      );
      return;
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (customerError) {
      setMessage("Failed to check profile.");
      setLoading(false);
      return;
    }

    const needsOnboarding =
      !customer ||
      !customer.first_name?.trim() ||
      !customer.last_name?.trim();

    if (needsOnboarding) {
      router.push("/auth/onboarding");
    } else {
      router.push("/dashboard");
    }

    router.refresh();
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-white/70">
          Email
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            Password
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-white/60 transition hover:text-cyan-400"
          >
            Forgot password?
          </Link>
        </div>

        <input
          type="password"
          placeholder="Enter your password"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Signing In..." : "Sign In"}
      </button>

      {message && (
        <p className="text-center text-sm text-red-400">{message}</p>
      )}

      <p className="text-center text-sm text-white/60">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="font-medium text-cyan-400 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}