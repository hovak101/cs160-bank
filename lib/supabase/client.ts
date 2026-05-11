import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    // Pin the cookie name so browser-set cookies are readable by SSR even
    // when the two clients point at different URLs (Docker self-host has
    // browser → localhost:8000, SSR → kong:8000).
    { cookieOptions: { name: "sb-vitality-bank-auth-token" } },
  );
}
