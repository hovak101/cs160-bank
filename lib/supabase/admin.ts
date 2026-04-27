import { createClient } from "@supabase/supabase-js";

// SUPABASE_INTERNAL_URL lets the Docker self-host stack point this
// server-only client at http://kong:8000 (compose network). Falls back
// to the public URL on Vercel/dev.
const supabaseUrl =
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);