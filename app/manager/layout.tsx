import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManagerShell } from "@/components/manager/ManagerShell";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({
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

  if (data?.role !== "manager") redirect("/auth/login");

  return <ManagerShell>{children}</ManagerShell>;
}
