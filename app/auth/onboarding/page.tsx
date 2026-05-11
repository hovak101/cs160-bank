import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { OnboardingForm } from "@/components/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Only customers go through onboarding; managers/admins/auditors skip it
  const { data: appUser } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (appUser?.role && appUser.role !== "customer") {
    redirect("/dashboard");
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const alreadyComplete =
    !!customer?.first_name?.trim() && !!customer?.last_name?.trim();

  if (alreadyComplete) {
    redirect("/dashboard");
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
                Complete Your Profile
              </CardTitle>
              <CardDescription className="text-white/60">
                Please add your personal information to continue.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <OnboardingForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}