import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateMoneyAmount } from "@/lib/banking/validation";

export const dynamic = "force-dynamic";

function generateReferenceNumber() {
  return `CBX-SEND-CASHBOX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function normalizePhone(phone: string | null | undefined) {
  return String(phone ?? "").replace(/\D/g, "");
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
    const phone_number = normalizePhone(body.phone_number);
    const amount = Number(body.amount ?? 0);

    if (!phone_number || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Phone number and valid amount are required." },
        { status: 400 }
      );
    }

    const amountError = validateMoneyAmount(amount);
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 });
    }

    const { data: senderCustomer, error: senderCustomerError } =
      await supabaseAdmin
        .from("customers")
        .select("customer_id, first_name, last_name, phone_number")
        .eq("user_id", user.id)
        .single();

    if (senderCustomerError || !senderCustomer) {
      return NextResponse.json(
        { error: "Customer profile not found." },
        { status: 404 }
      );
    }

    const senderPhone = normalizePhone(senderCustomer.phone_number);

    let { data: senderCashbox } = await supabaseAdmin
      .from("cashboxes")
      .select("cashbox_id, balance")
      .eq("customer_id", senderCustomer.customer_id)
      .maybeSingle();

    if (!senderCashbox) {
      return NextResponse.json(
        { error: "CashBox not found." },
        { status: 404 }
      );
    }

    if (Number(senderCashbox.balance ?? 0) < amount) {
      return NextResponse.json(
        { error: "Insufficient CashBox balance." },
        { status: 400 }
      );
    }

    const { data: receiverCustomer, error: receiverCustomerError } =
      await supabaseAdmin
        .from("customers")
        .select("customer_id, first_name, last_name, phone_number, user_id")
        .eq("phone_number", phone_number)
        .single();

    if (receiverCustomerError || !receiverCustomer) {
      return NextResponse.json(
        { error: "Receiver not found." },
        { status: 404 }
      );
    }

    if (receiverCustomer.customer_id === senderCustomer.customer_id) {
      return NextResponse.json(
        { error: "You cannot send money to yourself." },
        { status: 400 }
      );
    }

    const { data: receiverUser } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("user_id", receiverCustomer.user_id)
      .single();

    if (["admin", "manager"].includes((receiverUser?.role ?? "").toLowerCase())) {
      return NextResponse.json(
        { error: "Cannot send money to admin or manager." },
        { status: 403 }
      );
    }

    let { data: receiverCashbox } = await supabaseAdmin
      .from("cashboxes")
      .select("cashbox_id, balance")
      .eq("customer_id", receiverCustomer.customer_id)
      .maybeSingle();

    if (!receiverCashbox) {
      const { data: createdCashbox, error: createCashboxError } =
        await supabaseAdmin
          .from("cashboxes")
          .insert({
            customer_id: receiverCustomer.customer_id,
            balance: 0,
          })
          .select("cashbox_id, balance")
          .single();

      if (createCashboxError || !createdCashbox) {
        return NextResponse.json(
          { error: "Failed to create receiver CashBox." },
          { status: 500 }
        );
      }

      receiverCashbox = createdCashbox;
    }

    const newSenderBalance = Number(senderCashbox.balance) - amount;
    const newReceiverBalance = Number(receiverCashbox.balance ?? 0) + amount;
    const referenceNumber = generateReferenceNumber();

    const { error: updateSenderError } = await supabaseAdmin
      .from("cashboxes")
      .update({
        balance: newSenderBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("cashbox_id", senderCashbox.cashbox_id);

    if (updateSenderError) {
      return NextResponse.json(
        { error: "Failed to deduct sender CashBox." },
        { status: 500 }
      );
    }

    const { error: updateReceiverError } = await supabaseAdmin
      .from("cashboxes")
      .update({
        balance: newReceiverBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("cashbox_id", receiverCashbox.cashbox_id);

    if (updateReceiverError) {
      await supabaseAdmin
        .from("cashboxes")
        .update({
          balance: Number(senderCashbox.balance),
        })
        .eq("cashbox_id", senderCashbox.cashbox_id);

      return NextResponse.json(
        { error: "Failed to credit receiver CashBox." },
        { status: 500 }
      );
    }

    const { error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        reference_number: referenceNumber,
        source_account_id: null,
        destination_account_id: null,
        amount,
        transaction_type: "cashbox_send",
        status: "completed",
        description: `CashBox from ${senderPhone} to ${phone_number}`,
        executed_at: new Date().toISOString(),
      });

    if (transactionError) {
      return NextResponse.json(
        {
          error: "Money moved but transaction log failed.",
          details: transactionError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "CashBox transfer successful.",
      reference_number: referenceNumber,
      amount,
      receiver_name: [receiverCustomer.first_name, receiverCustomer.last_name]
        .filter(Boolean)
        .join(" "),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}