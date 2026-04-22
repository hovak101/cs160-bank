// IMPORTANT: Use the SERVER client, not the client-side one
import { createClient } from "@/lib/supabase/server"; 
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  // Initialize the Server-Side Supabase client
  const supabase = await createClient();

  // 1. Get the authenticated user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // If no user is found, send them to the login page
  if (authError || !user) {
    redirect("/auth/login");
  }

  // 2. Fetch profile details
  // Note: If you don't have a 'profiles' table yet, this will return an error, 
  // but the fallback below handles it using user_metadata.
  const { data: profile } = await supabase
    .from("profiles") 
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Construct the data to pass to the client component
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