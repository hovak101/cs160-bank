import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function makeReferenceNumber() {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const accountId = body.accountId as string;
    const amount = Number(body.amount);
    const description = (body.description as string) || "ATM cash withdrawal";

    if (!accountId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid account or amount." },
        { status: 400 }
      );
    }

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

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, balance, status")
      .eq("account_id", accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (account.customer_id !== customer.customer_id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (account.status !== "active") {
      return NextResponse.json(
        { error: "Account is not active." },
        { status: 400 }
      );
    }

    if (Number(account.balance) < amount) {
      return NextResponse.json(
        { error: "Insufficient funds." },
        { status: 400 }
      );
    }

    const newBalance = Number(account.balance) - amount;

    const { error: updateError } = await supabase
      .from("accounts")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", accountId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    const { error: txError } = await supabase.from("transactions").insert({
      reference_number: makeReferenceNumber(),
      source_account_id: accountId,
      destination_account_id: null,
      amount,
      transaction_type: "withdrawal",
      status: "completed",
      description,
      executed_at: new Date().toISOString(),
    });

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, newBalance });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}