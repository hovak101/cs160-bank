import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardRedirect() {
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

  if (data?.role === "customer") redirect("/customer/dashboard");
  if (data?.role === "manager") redirect("/manager/dashboard");
  redirect("/auth/login");
}
