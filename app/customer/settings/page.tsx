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
    .from("profiles") 
    .select("full_name")
    .eq("id", user.id)
    .single();

  const initialData = {
    name: profile?.full_name || user.user_metadata?.full_name || "",
    email: user.email || "",
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <SettingsForm initialData={initialData} />
    </div>
  );
}