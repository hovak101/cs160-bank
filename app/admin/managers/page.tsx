import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlaceholderPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();
    if (userData?.role !== "admin") {
      redirect("/dashboard");
    }
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a2847] to-[#0f172a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f172a]/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Landmark className="h-5 w-5 text-teal-400" />
            Vitality <span className="text-teal-400">Bank</span>
          </div>

          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-teal-400 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-10 shadow-2xl text-center">
          {/* Glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />

          <div className="relative z-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
              Coming Soon
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-white">
              Managers
            </h1>

            <p className="mt-3 text-slate-400 max-w-xl mx-auto">
              Placeholder
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}