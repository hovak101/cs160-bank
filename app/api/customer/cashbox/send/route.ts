import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function generateReferenceNumber() {
  return `CBX-SEND-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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
    const phone_number = String(body.phone_number ?? "").trim();
    const source_account_id = String(body.source_account_id ?? "").trim();
    const amount = Number(body.amount ?? 0);

    if (!phone_number || !source_account_id || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Phone number, source account, and valid amount are required." },
        { status: 400 }
      );
    }

    const { data: senderCustomer, error: senderCustomerError } = await supabaseAdmin
      .from("customers")
      .select("customer_id, phone_number")
      .eq("user_id", user.id)
      .single();

    if (senderCustomerError || !senderCustomer) {
      return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });
    }

    const { data: sourceAccount, error: sourceAccountError } = await supabaseAdmin
      .from("accounts")
      .select("account_id, customer_id, balance, currency, status")
      .eq("account_id", source_account_id)
      .eq("customer_id", senderCustomer.customer_id)
      .single();

    if (sourceAccountError || !sourceAccount) {
      return NextResponse.json({ error: "Source account not found." }, { status: 404 });
    }

    if ((sourceAccount.status ?? "").toLowerCase() !== "active") {
      return NextResponse.json({ error: "Only active accounts can send money." }, { status: 400 });
    }

    if (Number(sourceAccount.balance ?? 0) < amount) {
      return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });
    }

    const { data: receiverCustomer, error: receiverCustomerError } = await supabaseAdmin
      .from("customers")
      .select("customer_id, first_name, last_name, phone_number")
      .eq("phone_number", phone_number)
      .single();

    if (receiverCustomerError || !receiverCustomer) {
      return NextResponse.json({ error: "Receiver not found by phone number." }, { status: 404 });
    }

    if (receiverCustomer.customer_id === senderCustomer.customer_id) {
      return NextResponse.json({ error: "You cannot send money to yourself." }, { status: 400 });
    }

    let { data: receiverCashbox } = await supabaseAdmin
      .from("cashboxes")
      .select("cashbox_id, balance")
      .eq("customer_id", receiverCustomer.customer_id)
      .maybeSingle();

    if (!receiverCashbox) {
      const { data: createdCashbox, error: createCashboxError } = await supabaseAdmin
        .from("cashboxes")
        .insert({
          customer_id: receiverCustomer.customer_id,
          balance: 0,
        })
        .select("cashbox_id, balance")
        .single();

      if (createCashboxError || !createdCashbox) {
        return NextResponse.json(
          {
            error: "Failed to create receiver CashBox.",
            details: createCashboxError?.message,
          },
          { status: 500 }
        );
      }

      receiverCashbox = createdCashbox;
    }

    const newSourceBalance = Number(sourceAccount.balance) - amount;
    const newCashboxBalance = Number(receiverCashbox.balance ?? 0) + amount;
    const referenceNumber = generateReferenceNumber();

    const { error: updateSourceError } = await supabaseAdmin
      .from("accounts")
      .update({
        balance: newSourceBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", sourceAccount.account_id);

    if (updateSourceError) {
      return NextResponse.json({ error: "Failed to deduct sender account balance." }, { status: 500 });
    }

    const { error: updateCashboxError } = await supabaseAdmin
      .from("cashboxes")
      .update({
        balance: newCashboxBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("cashbox_id", receiverCashbox.cashbox_id);

    if (updateCashboxError) {
      await supabaseAdmin
        .from("accounts")
        .update({
          balance: Number(sourceAccount.balance),
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", sourceAccount.account_id);

      return NextResponse.json(
        {
          error: "Failed to credit receiver CashBox.",
          details: updateCashboxError.message,
        },
        { status: 500 }
      );
    }

    const { error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        reference_number: referenceNumber,
        source_account_id: sourceAccount.account_id,
        destination_account_id: null,
        amount,
        transaction_type: "cashbox_send",
        status: "completed",
        description: `Sent to CashBox (${phone_number})`,
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
      message: "Money sent successfully.",
      reference_number: referenceNumber,
      amount,
      receiver_name: [receiverCustomer.first_name, receiverCustomer.last_name]
        .filter(Boolean)
        .join(" "),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}