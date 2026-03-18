import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ClientLayout from "./client-layout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: userData } = await supabase
    .from("users")
    .select("email")
    .eq("user_id", user.id)
    .single();

  const email = userData?.email ?? user.email ?? "";

  return <ClientLayout email={email}>{children}</ClientLayout>;
}