import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Landmark } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="dark min-h-screen bg-charcoal-950 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(174_72%_42%_/_0.12),transparent_70%)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Landmark className="h-5 w-5 text-teal-400" />
          <span className="text-lg font-semibold text-white">
            Vitality <span className="text-teal-400">Bank</span>
          </span>
        </div>

        <div className="rounded-2xl border border-charcoal-700 bg-charcoal-900 shadow-xl overflow-hidden">
          <div className="px-8 pt-8 pb-2">
            <h1 className="text-xl font-semibold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-charcoal-400">
              Sign in to your Vitality Bank account.
            </p>
          </div>
          <div className="px-8 pb-8 pt-4">
            <LoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-charcoal-500">
          <Link href="/" className="hover:text-charcoal-300 transition">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
