import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {accountId} = await params;

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("account_id, customer_id, balance, status")
    .eq("account_id", accountId)
    .eq("customer_id", customer.customer_id)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (account.status === "closed") {
    return NextResponse.json({ error: "Account already closed" }, { status: 400 });
  }

  const balance = +account.balance;

  // must be zero before closing
  if (balance !== 0) {
    return NextResponse.json({ error: "Balance must be 0 before closing" }, { status: 400 });
  }

  const { error } = await supabase
    .from("accounts")
    .update({ status: "closed" })
    .eq("account_id", accountId);

  if (error) {
    return NextResponse.json({ error: "An error occured while closing the account" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Account successfully closed :)" });
}
