"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden rounded-3xl border border-slate-200 shadow-xl bg-white">
        
        {/* Left - Branding */}
        <section className="p-10 md:p-12 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
              <span className="text-xl font-semibold">G3</span>
            </div>
            <div>
              <div className="text-sm text-white/70">Online Banking</div>
              <div className="text-2xl font-semibold">Group 3 Bank</div>
            </div>
          </div>

          <p className="mt-8 text-white/75 leading-relaxed">
            Secure access to accounts, transfers, and bill payments.
          </p>

          <div className="mt-12 text-xs text-white/50">
            © 2026 Group 3 Bank • CS160
          </div>
        </section>

        {/* Right - Buttons Only */}
        <section className="p-10 md:p-12 flex flex-col justify-center space-y-6">
          <h1 className="text-2xl font-semibold text-slate-900 text-center">
            Welcome
          </h1>

          <Link
            href="/auth/login"
            className="w-full h-12 rounded-xl bg-slate-900 text-white font-medium
                       hover:bg-slate-800 transition flex items-center justify-center"
          >
            Sign In
          </Link>

          <Link
            href="/auth/sign-up"
            className="w-full h-12 rounded-xl border border-slate-200 text-slate-900 font-medium
                       hover:bg-slate-50 transition flex items-center justify-center"
          >
            Sign Up
          </Link>

          <Link
            href="/auth/forgot-password"
            className="text-center text-sm text-slate-600 hover:text-slate-900 hover:underline"
          >
            Forgot Password?
          </Link>
        </section>
      </div>
    </main>
  );
}