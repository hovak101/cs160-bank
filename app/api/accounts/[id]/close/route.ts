import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {id: accountId} =  await ctx.params


  const {
    data: { user },
  } = await supabase.auth.getUser()


  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get customer id
  const{ data: customer, error: customerError} = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();
    if(!customer || customerError) {
      return NextResponse.json({ error: "Customer profile not found" }, { status: 404 })
    }

  // Get account
  const { data: account, error: fetchError } = await supabase
    .from("accounts")
    .select("*")
    .eq("account_id", accountId)
    .single()

  if (fetchError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  // Make sure user owns it (extra safety even with RLS)
  if (account.customer_id !== customer.customer_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Check it's open
  if (account.status !== "active") {
    return NextResponse.json(
      { error: "Account already closed" },
      { status: 400 }
    )
  }

  // Enforce balance must be 0
  if (Number(account.balance) !== 0.00) {
    return NextResponse.json(
      { error: "Account balance must be zero to close" },
      { status: 400 }
    )
  }

  // Close account


  const { data: updatedRows, error: updateError } = await supabase
    .from("accounts")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("account_id", accountId)
    .select("account_id, status, closed_at")

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json(
      { error: "No rows updated. Likely RLS blocked the update or account_id did not match." },
      { status: 403 }
    );
  }

  if (updatedRows.length > 1) {
    return NextResponse.json(
      { error: "Unexpected: multiple rows updated. account_id may not be unique." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Account closed successfully",
    updated: updatedRows[0],
  });
}