import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();       
  const supabaseAdmin = createAdminClient();   
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData, error: roleError } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (roleError || !userData || userData.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, firstName, lastName, employeeId } = body;

  if (!email || !password || !firstName || !lastName || !employeeId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const { data: authData, error: signUpError } =
      await supabaseAdmin.auth.signUp({
        email,
        password
      });

    if (signUpError || !authData.user) {
      return NextResponse.json(
        { error: signUpError?.message || "Failed to create auth user" },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    const { error: newUserError } = await supabaseAdmin
      .from("users")
      .insert({
        user_id: newUserId,
        email,
        role: "manager",
        is_active: true,
      });

    if (newUserError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: newUserError.message || "Failed to create user record" },
        { status: 500 }
      );
    }

    const { data: manager, error: managerError } = await supabaseAdmin
      .from("managers")
      .insert({
        user_id: newUserId,
        first_name: firstName,
        last_name: lastName,
        employee_id: employeeId,
      })
      .select("*")
      .single();

    if (managerError) {
      await supabaseAdmin.from("users").delete().eq("user_id", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);

      return NextResponse.json(
        { error: managerError.message || "Failed to create manager record" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Manager account created successfully",
        manager,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}