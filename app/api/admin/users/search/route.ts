import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";

type UserRow = {
  user_id: string;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  mfa_enabled: boolean | null;
  failed_login_attempts: number | null;
  account_locked_until: string | null;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string | null;
  deactivation_reason: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(["admin"]);
    if (!auth.ok) return auth.response;
    const { supabase } = auth;
    const q = (req.nextUrl.searchParams.get("q") || "").trim();

    let query = supabase
      .from("users")
      .select(`
        user_id,
        email,
        role,
        is_active,
        mfa_enabled,
        failed_login_attempts,
        account_locked_until,
        last_login_at,
        password_changed_at,
        created_at,
        deactivation_reason
      `)
      .eq("role", "customer")
      .order("created_at", { ascending: false });

    if (q) {
      query = query.ilike("email", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data ?? []) as unknown as UserRow[],
    });
  } catch (error) {
    console.error("Search users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 }
    );
  }
}