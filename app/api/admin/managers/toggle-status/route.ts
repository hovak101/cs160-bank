import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";

type LockType = "permanent" | "24h" | "7d";

function getLockedUntil(lockType: LockType) {
  const now = Date.now();

  if (lockType === "24h") {
    return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  }

  if (lockType === "7d") {
    return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  return null;
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(["admin"]);
    if (!auth.ok) return auth.response;
    const { supabase } = auth;
    const body = await req.json();

    const managerId = body.manager_id as string | undefined;
    const action = body.action as "activate" | "deactivate" | undefined;
    const reason = body.reason as string | undefined;
    const lockType = body.lock_type as LockType | undefined;

    if (!managerId || !action) {
      return NextResponse.json(
        { error: "manager_id and action are required." },
        { status: 400 }
      );
    }

    const { data: manager, error: managerErr } = await supabase
      .from("managers")
      .select("manager_id, user_id")
      .eq("manager_id", managerId)
      .single();

    if (managerErr || !manager) {
      return NextResponse.json(
        { error: managerErr?.message || "Manager not found." },
        { status: 404 }
      );
    }

    let userUpdate: Record<string, unknown> = {};
    let managerActive = true;

    if (action === "activate") {
      userUpdate = {
        is_active: true,
        account_locked_until: null,
        deactivation_reason: null,
      };
      managerActive = true;
    } else if (action === "deactivate") {
      if (!reason || !lockType) {
        return NextResponse.json(
          { error: "reason and lock_type are required for deactivation." },
          { status: 400 }
        );
      }

      if (lockType === "permanent") {
        userUpdate = {
          is_active: false,
          account_locked_until: null,
          deactivation_reason: reason,
        };
        managerActive = false;
      } else {
        userUpdate = {
          is_active: true,
          account_locked_until: getLockedUntil(lockType),
          deactivation_reason: reason,
        };
        managerActive = true;
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { error: userErr } = await supabase
      .from("users")
      .update(userUpdate)
      .eq("user_id", manager.user_id);

    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }

    const { data: managerRow, error: managerUpdateErr } = await supabase
      .from("managers")
      .update({ is_active: managerActive })
      .eq("manager_id", managerId)
      .select("manager_id, user_id, first_name, last_name, employee_id, created_at, is_active")
      .single();

    if (managerUpdateErr) {
      return NextResponse.json(
        { error: managerUpdateErr.message },
        { status: 500 }
      );
    }

    const { data: userRow } = await supabase
      .from("users")
      .select(
        "email, is_active, mfa_enabled, failed_login_attempts, account_locked_until, last_login_at, password_changed_at, deactivation_reason"
      )
      .eq("user_id", manager.user_id)
      .single();

    return NextResponse.json({
      data: {
        ...managerRow,
        email: userRow?.email ?? null,
        user_is_active: userRow?.is_active ?? null,
        mfa_enabled: userRow?.mfa_enabled ?? null,
        failed_login_attempts: userRow?.failed_login_attempts ?? null,
        account_locked_until: userRow?.account_locked_until ?? null,
        last_login_at: userRow?.last_login_at ?? null,
        password_changed_at: userRow?.password_changed_at ?? null,
        deactivation_reason: userRow?.deactivation_reason ?? null,
      },
    });
  } catch (error) {
    console.error("Toggle manager status error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update manager.",
      },
      { status: 500 }
    );
  }
}
