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

    const userId = body.user_id as string | undefined;
    const action = body.action as "activate" | "deactivate" | undefined;
    const reason = body.reason as string | undefined;
    const lockType = body.lock_type as LockType | undefined;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "user_id and action are required." },
        { status: 400 }
      );
    }

    let updatePayload: Record<string, unknown> = {};

    if (action === "activate") {
      updatePayload = {
        is_active: true,
        account_locked_until: null,
        deactivation_reason: null,
      };
    }

    if (action === "deactivate") {
      if (!reason || !lockType) {
        return NextResponse.json(
          { error: "reason and lock_type are required for deactivation." },
          { status: 400 }
        );
      }

      if (lockType === "permanent") {
        updatePayload = {
          is_active: false,
          account_locked_until: null,
          deactivation_reason: reason,
        };
      } else {
        updatePayload = {
          is_active: true,
          account_locked_until: getLockedUntil(lockType),
          deactivation_reason: reason,
        };
      }
    }

    const { data, error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("user_id", userId)
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
      `);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No user was updated." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error("Toggle user status error:", error);
    return NextResponse.json(
      { error: "Failed to update user status." },
      { status: 500 }
    );
  }
}