"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Invalid email or password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full h-11 rounded-xl border border-charcoal-700 bg-charcoal-800 px-3 text-sm text-white placeholder-charcoal-400 outline-none focus:border-teal-500 transition";
  const labelClass =
    "block text-xs font-medium text-charcoal-300 uppercase tracking-wide";

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className={labelClass}>Password</label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-charcoal-400 hover:text-teal-400 transition"
          >
            Forgot password?
          </Link>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 w-full h-11 rounded-xl bg-teal-500 text-sm font-semibold text-white hover:bg-teal-400 transition disabled:opacity-60"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>

      <p className="text-center text-sm text-charcoal-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="text-teal-400 hover:text-teal-300 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
