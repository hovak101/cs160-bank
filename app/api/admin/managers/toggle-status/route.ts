import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(["admin"]);
    if (!auth.ok) return auth.response;
    const { supabase } = auth;
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
