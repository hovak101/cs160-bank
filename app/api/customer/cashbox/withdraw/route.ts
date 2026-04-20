import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function generateReferenceNumber() {
  return `CBX-WITHDRAW-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const target_account_id = String(body.target_account_id ?? "").trim();
    const amount = Number(body.amount ?? 0);

    if (!target_account_id || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Target account and valid amount are required." },
        { status: 400 }
      );
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

    let { data: cashbox } = await supabase
      .from("cashboxes")
      .select("cashbox_id, balance")
      .eq("customer_id", customer.customer_id)
      .maybeSingle();

    if (!cashbox) {
      const { data: createdCashbox, error: createCashboxError } = await supabase
        .from("cashboxes")
        .insert({
          customer_id: customer.customer_id,
          balance: 0,
        })
        .select("cashbox_id, balance")
        .single();

      if (createCashboxError || !createdCashbox) {
        return NextResponse.json(
          { error: "Failed to create CashBox." },
          { status: 500 }
        );
      }

      cashbox = createdCashbox;
    }

    if (Number(cashbox.balance ?? 0) < amount) {
      return NextResponse.json(
        { error: "Insufficient CashBox balance." },
        { status: 400 }
      );
    }

    const { data: targetAccount, error: targetAccountError } = await supabase
      .from("accounts")
      .select(
        "account_id, customer_id, account_name, account_type, account_number, balance, currency, status"
      )
      .eq("account_id", target_account_id)
      .eq("customer_id", customer.customer_id)
      .single();

    if (targetAccountError || !targetAccount) {
      return NextResponse.json(
        { error: "Target account not found." },
        { status: 404 }
      );
    }

    if ((targetAccount.status ?? "").toLowerCase() !== "active") {
      return NextResponse.json(
        { error: "Only active accounts can receive CashBox funds." },
        { status: 400 }
      );
    }

    const newCashboxBalance = Number(cashbox.balance) - amount;
    const newAccountBalance = Number(targetAccount.balance ?? 0) + amount;
    const referenceNumber = generateReferenceNumber();

    const destinationLabel = `${
      targetAccount.account_name || targetAccount.account_type || "Account"
    } • ****${targetAccount.account_number?.slice(-4) ?? ""}`;

    const { error: updateCashboxError } = await supabase
      .from("cashboxes")
      .update({
        balance: newCashboxBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("cashbox_id", cashbox.cashbox_id);

    if (updateCashboxError) {
      return NextResponse.json(
        { error: "Failed to deduct CashBox balance." },
        { status: 500 }
      );
    }

    const { error: updateAccountError } = await supabase
      .from("accounts")
      .update({
        balance: newAccountBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", targetAccount.account_id);

    if (updateAccountError) {
      await supabase
        .from("cashboxes")
        .update({
          balance: Number(cashbox.balance),
          updated_at: new Date().toISOString(),
        })
        .eq("cashbox_id", cashbox.cashbox_id);

      return NextResponse.json(
        { error: "Failed to credit target account." },
        { status: 500 }
      );
    }

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        reference_number: referenceNumber,
        source_account_id: null,
        destination_account_id: targetAccount.account_id,
        amount,
        transaction_type: "cashbox_withdraw",
        status: "completed",
        description: `Withdraw from CashBox to ${destinationLabel}`,
        executed_at: new Date().toISOString(),
      });

    if (transactionError) {
      return NextResponse.json(
        {
          error: "Money moved, but transaction history insert failed.",
          details: transactionError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "CashBox funds transferred successfully.",
      reference_number: referenceNumber,
      amount,
      destination_account: destinationLabel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}