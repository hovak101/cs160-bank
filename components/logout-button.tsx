"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type ButtonVariant = "default" | "ghost" | "outline" | "destructive" | "secondary" | "link";

export function LogoutButton({ variant = "default" }: { variant?: ButtonVariant }) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button variant={variant} onClick={logout}>
      Sign Out
    </Button>
  );
}
