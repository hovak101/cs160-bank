import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

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

          <div className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)] backdrop-blur">
            <div className="px-8 pt-8 pb-2">
              <h1 className="text-3xl font-semibold text-white">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Sign in to your Vitality Bank account.
              </p>
            </div>

            <div className="px-8 pb-8 pt-4">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}