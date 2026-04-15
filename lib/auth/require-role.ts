import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Role = Database["public"]["Enums"]["role"];

export type RequireRoleResult =
  | {
      ok: true;
      user: User;
      role: Role;
      supabase: SupabaseClient<Database>;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireRole(
  allowed: readonly Role[],
): Promise<RequireRoleResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: row, error: roleError } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !row || !row.role) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = row.role as Role;

  if (allowed.length > 0 && !allowed.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, user, role, supabase };
}
