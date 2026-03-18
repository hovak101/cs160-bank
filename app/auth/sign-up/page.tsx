"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Landmark, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function Page() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setSignupSuccess(true);
    setLoading(false);
  };

  if (signupSuccess) {
    return (
      <div className="dark min-h-svh bg-[#050816] text-white">
        <div className="flex min-h-svh items-center justify-center px-6">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-center gap-2">
              <Landmark className="h-5 w-5 text-cyan-400" />
              <span className="text-xl font-semibold">
                Vitality <span className="text-cyan-400">Bank</span>
              </span>
            </div>

            <Card className="border border-white/10 bg-white/5 shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)] backdrop-blur">
              <CardHeader className="text-center">
                <div className="mb-2 flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-cyan-400" />
                </div>
                <CardTitle className="text-3xl text-white">
                  Signup Successful
                </CardTitle>
                <CardDescription className="text-white/60">
                  Your account has been created successfully.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-center text-sm text-white/70">
                  You can now sign in to access your Vitality Bank account.
                </p>

                <button
                  onClick={() => router.push("/auth/login")}
                  className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300"
                >
                  Go to Login
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-svh bg-[#050816] text-white">
      <div className="flex min-h-svh items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Landmark className="h-5 w-5 text-cyan-400" />
            <span className="text-xl font-semibold">
              Vitality <span className="text-cyan-400">Bank</span>
            </span>
          </div>

          <Card className="border border-white/10 bg-white/5 shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-3xl text-white">
                Create Account
              </CardTitle>
              <CardDescription className="text-white/60">
                Open your Vitality Bank account today.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
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
                  <label className="text-xs font-medium uppercase tracking-wide text-white/70">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-white/70">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Create Account"}
                </button>

                {message && (
                  <p className="text-center text-sm text-red-400">
                    {message}
                  </p>
                )}

                <p className="text-center text-sm text-white/60">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="font-medium text-cyan-400 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}