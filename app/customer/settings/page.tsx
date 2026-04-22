import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("customers")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .single();

  const dbFullName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : null;

  const initialData = {
    name: dbFullName || user.user_metadata?.full_name || "",
    email: user.email || "",
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <SettingsForm initialData={initialData} />
    </div>
  );
}