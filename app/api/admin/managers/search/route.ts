import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";

type ManagerRow = {
  manager_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  employee_id: string | null;
  created_at: string | null;
  is_active: boolean | null;
  email: string | null;
  user_is_active: boolean | null;
  mfa_enabled: boolean | null;
  failed_login_attempts: number | null;
  account_locked_until: string | null;
  last_login_at: string | null;
  password_changed_at: string | null;
  deactivation_reason: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(["admin", "manager"]);
    if (!auth.ok) return auth.response;
    const { supabase } = auth;
    const q = (req.nextUrl.searchParams.get("q") || "").trim();

    const { data: managers, error } = await supabase
      .from("managers")
      .select(`
        manager_id,
        user_id,
        first_name,
        last_name,
        employee_id,
        created_at,
        is_active
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allManagers = managers ?? [];
    const userIds = allManagers.map((m) => m.user_id);

    const userMap = new Map<
      string,
      {
        email: string | null;
        is_active: boolean | null;
        mfa_enabled: boolean | null;
        failed_login_attempts: number | null;
        account_locked_until: string | null;
        last_login_at: string | null;
        password_changed_at: string | null;
        deactivation_reason: string | null;
      }
    >();

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select(
          "user_id, email, is_active, mfa_enabled, failed_login_attempts, account_locked_until, last_login_at, password_changed_at, deactivation_reason"
        )
        .in("user_id", userIds);

      (users ?? []).forEach((u) => {
        userMap.set(u.user_id, {
          email: u.email,
          is_active: u.is_active,
          mfa_enabled: u.mfa_enabled,
          failed_login_attempts: u.failed_login_attempts,
          account_locked_until: u.account_locked_until,
          last_login_at: u.last_login_at,
          password_changed_at: u.password_changed_at,
          deactivation_reason: u.deactivation_reason,
        });
      });
    }

    let filtered = allManagers;
    if (q) {
      const lower = q.toLowerCase();
      filtered = allManagers.filter((m) => {
        const userInfo = userMap.get(m.user_id);
        const emailMatch = (userInfo?.email || "").toLowerCase().includes(lower);
        const firstMatch = (m.first_name || "").toLowerCase().includes(lower);
        const lastMatch = (m.last_name || "").toLowerCase().includes(lower);
        const employeeMatch = (m.employee_id || "").toLowerCase().includes(lower);
        return emailMatch || firstMatch || lastMatch || employeeMatch;
      });
    }

    const data: ManagerRow[] = filtered.map((m) => {
      const userInfo = userMap.get(m.user_id);
      return {
        manager_id: m.manager_id,
        user_id: m.user_id,
        first_name: m.first_name,
        last_name: m.last_name,
        employee_id: m.employee_id,
        created_at: m.created_at,
        is_active: m.is_active,
        email: userInfo?.email ?? null,
        user_is_active: userInfo?.is_active ?? null,
        mfa_enabled: userInfo?.mfa_enabled ?? null,
        failed_login_attempts: userInfo?.failed_login_attempts ?? null,
        account_locked_until: userInfo?.account_locked_until ?? null,
        last_login_at: userInfo?.last_login_at ?? null,
        password_changed_at: userInfo?.password_changed_at ?? null,
        deactivation_reason: userInfo?.deactivation_reason ?? null,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Search managers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch managers." },
      { status: 500 }
    );
  }
}
