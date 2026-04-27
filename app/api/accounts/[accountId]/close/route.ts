import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function mapAccountStatusToCardStatus(status: "active" | "frozen" | "closed") {
  return status === "active" ? "active" : "locked";
}

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

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();
  
   if (userData?.role !== "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   }
  
  const { data: account } = await supabase
    .from("accounts")
    .select("account_id, customer_id, account_type, balance, status")
    .eq("account_id", accountId)
    .eq("customer_id", customer.customer_id)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (account.status === "closed") {
    return NextResponse.json({ error: "Account already closed" }, { status: 400 });
  }

  const balance = +account.balance;

  if (account.account_type === "credit") {
    const { data: creditAccount } = await supabase
      .from("credit_accounts")
      .select("current_balance")
      .eq("account_id", accountId)
      .maybeSingle();

    if (Number(creditAccount?.current_balance || 0) !== 0) {
      return NextResponse.json(
        { error: "Credit card balance must be fully paid before closing." },
        { status: 400 }
      );
    }
  } else if (balance !== 0) {
    return NextResponse.json({ error: "Balance must be 0 before closing" }, { status: 400 });
  }

  const closedAt = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("accounts")
    .update({ status: "closed", updated_at: closedAt })
    .eq("account_id", accountId);

  if (error) {
    return NextResponse.json({ error: "An error occured while closing the account" }, { status: 500 });
  }

  if (account.account_type === "credit") {
    const { error: creditCardStatusError } = await supabaseAdmin
      .from("credit_cards")
      .update({
        card_status: mapAccountStatusToCardStatus("closed"),
        updated_at: closedAt,
      })
      .eq("account_id", accountId);

    if (creditCardStatusError) {
      return NextResponse.json(
        { error: "Account closed, but credit card lock state was not updated." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, message: "Account successfully closed :)" });
}
