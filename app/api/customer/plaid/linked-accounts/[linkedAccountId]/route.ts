import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ linkedAccountId: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer profile not found." },
        { status: 404 }
      );
    }

    const { linkedAccountId } = await params;

    const { error } = await supabaseAdmin
      .from("plaid_linked_accounts")
      .delete()
      .eq("linked_account_id", linkedAccountId)
      .eq("customer_id", customer.customer_id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to remove linked account." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("plaid linked account delete error:", error);
    return NextResponse.json(
      { error: "Failed to remove linked Plaid account." },
      { status: 500 }
    );
  }
}
