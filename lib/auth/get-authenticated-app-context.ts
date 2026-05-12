import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

type AppUserRow = {
  role: string | null;
  email: string | null;
};

type CustomerRow = {
  customer_id: string;
  first_name: string | null;
  last_name: string | null;
};

export const getAuthenticatedAppContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      appUser: null,
      customer: null,
    };
  }

  const [{ data: appUser }, { data: customer }] = await Promise.all([
    supabase
      .from("users")
      .select("role, email")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("customer_id, first_name, last_name")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    supabase,
    user,
    appUser: (appUser as AppUserRow | null) ?? null,
    customer: (customer as CustomerRow | null) ?? null,
  };
});
