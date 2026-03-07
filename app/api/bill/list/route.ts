import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer profile not found." },
        { status: 404 }
      );
    }

    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("account_id")
      .eq("customer_id", customer.customer_id);

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 500 });
    }

    const ids = (accounts || []).map((a) => a.account_id);

    if (!ids.length) {
      return NextResponse.json({ schedules: [] });
    }

    const { data, error } = await supabase
      .from("bill_schedules")
      .select("*")
      .in("account_id", ids)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedules: data || [] });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}