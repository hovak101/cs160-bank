import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ManagerItem = {
  manager_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  employee_id: string | null;
  created_at: string | null;
  is_active: boolean | null;
};

function generateUniqueEmployeeId(): string {
  return String(Math.floor(Math.random() * 90000000) + 10000000);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { email, first_name, last_name } = body;

    if (!email || email.trim() === "") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!first_name || first_name.trim() === "") {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      );
    }

    if (!last_name || last_name.trim() === "") {
      return NextResponse.json(
        { error: "Last name is required" },
        { status: 400 }
      );
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", email.trim())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
        email,
        password:"123456",
        email_confirm: true,
        user_metadata: {
        first_name,
        last_name,
        role: "manager",
        },
    });

    if (authError) throw authError;

    const userId = authData.user.id;


    // Create new manager record with generated employee_id
    const employeeId = generateUniqueEmployeeId().toString();
    const { data: newManager, error: createError } = await supabaseAdmin
      .from("managers")
      .update({ employee_id: employeeId })
      .select(`
        manager_id,
        user_id,
        first_name,
        last_name,
        employee_id,
        created_at,
        is_active
      `)
      .eq("user_id", userId)
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return NextResponse.json({ data: newManager });
  } catch (error) {
    console.error("Add manager error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add manager." },
      { status: 500 }
    );
  }
}
