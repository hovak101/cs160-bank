import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/ui/dashboard-layout";
import { IdleLogoutProvider } from "@/components/auth/idle-logout-provider";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (data?.role !== "customer") redirect("/auth/login");

  return (
    <IdleLogoutProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </IdleLogoutProvider>
  );
}