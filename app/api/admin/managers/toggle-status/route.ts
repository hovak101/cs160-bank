import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ManagerRow = {
  manager_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  employee_id: string | null;
  created_at: string | null;
  is_active: boolean | null;
};

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { manager_id, action } = body;

    if (!manager_id || !action) {
      return NextResponse.json(
        { error: "Missing manager_id or action" },
        { status: 400 }
      );
    }

    if (action === "deactivate") {
      const { data, error } = await supabase
        .from("managers")
        .update({ is_active: false })
        .eq("manager_id", manager_id)
        .select(`
          manager_id,
          user_id,
          first_name,
          last_name,
          employee_id,
          created_at,
          is_active
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Also flip public.users.is_active so login gate (login-form.tsx)
      // actually blocks sign-in. Without this, only managers.is_active is set
      // and the manager can still log in.
      const { error: userErr } = await supabase
        .from("users")
        .update({
          is_active: false,
          account_locked_until: null,
          deactivation_reason: "Deactivated by administrator",
        })
        .eq("user_id", data.user_id);

      if (userErr) {
        throw new Error(userErr.message);
      }

      return NextResponse.json({ data });
    }

    if (action === "activate") {
      const { data, error } = await supabase
        .from("managers")
        .update({ is_active: true })
        .eq("manager_id", manager_id)
        .select(`
          manager_id,
          user_id,
          first_name,
          last_name,
          employee_id,
          created_at,
          is_active
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const { error: userErr } = await supabase
        .from("users")
        .update({
          is_active: true,
          account_locked_until: null,
          deactivation_reason: null,
        })
        .eq("user_id", data.user_id);

      if (userErr) {
        throw new Error(userErr.message);
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Toggle manager status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update manager." },
      { status: 500 }
    );
  }
}
